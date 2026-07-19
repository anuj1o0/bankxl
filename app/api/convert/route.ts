import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { extractFromPDF, extractFromPDFChunked, mergeAndClean, ExtractionResult } from '@/lib/gemini'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import { bankNameFromFilename } from '@/lib/normalize'
import {
  getUser, checkUsage, recordConversion, updateConversion, consumePages,
  isValidFormat, CHUNK_THRESHOLD, PAGES_PER_CHUNK,
} from './pipeline'

// Legacy single-request conversion endpoint.
//
// Still the right path for SMALL PDFs (≤ CHUNK_THRESHOLD pages): one Gemini
// call, one response, no orchestration overhead. The browser client
// (lib/convert-client.ts) sends large PDFs through the chunked flow
// (/api/convert/start → /chunk × N → /finalize) instead, where every chunk
// gets its own serverless invocation — so this route's 60s ceiling stops
// being a reason large statements fail.
//
// Also remains the fallback for any caller that can't run the client-side
// orchestrator (old tabs, scripts POSTing directly).
export const maxDuration = 60
export const runtime = 'nodejs'

async function getPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const d = await pdfParse(buffer, { max: 0 } as any)
    return d.numpages || 1
  } catch (e) {
    console.warn('pdf-parse failed:', e)
    return 1
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to convert.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request — could not read uploaded file.' }, { status: 400 })
  }

  const file = formData.get('pdf') as File | null
  const requestedFormat = (formData.get('format') as string) || 'excel'
  const format: ExportFormat = isValidFormat(requestedFormat) ? requestedFormat : 'excel'
  const brandFromForm = (formData.get('brandName') as string) || undefined

  if (!file) return NextResponse.json({ error: 'No file received.' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 25 MB.' }, { status: 400 })
  }
  if (file.size < 200) {
    return NextResponse.json({ error: 'File appears to be empty or corrupt.' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Step 1: validate the PDF (magic bytes, encryption, page count). This
  // catches password-protected, corrupt, and not-actually-PDF files with
  // friendly error messages BEFORE we burn any Gemini calls.
  const tPages = Date.now()
  let pageCount: number
  try {
    const info = await validatePdf(fileBuffer)
    pageCount = info.pageCount
    console.log(`[convert] validated: ${Date.now() - tPages}ms (${pageCount} pages, ${(file.size / 1024).toFixed(0)} KB${info.isEncrypted ? ', encrypted' : ''})`)
  } catch (e: any) {
    if (e instanceof PdfValidationError) {
      console.warn(`[convert] PDF validation failed: ${e.userMessage} (${e.detail || '-'})`)
      return NextResponse.json({ error: e.userMessage }, { status: 400 })
    }
    // Fallback to pdf-parse if pdf-lib bombs in some weird way
    pageCount = await getPageCount(fileBuffer)
    if (pageCount < 1) {
      return NextResponse.json({ error: 'Could not read PDF. Make sure the file is a valid, unlocked PDF.' }, { status: 400 })
    }
  }

  // Step 2: usage check using actual page count
  const usage = await checkUsage(user, format, pageCount)
  if (!usage.allowed) {
    return NextResponse.json({
      error: usage.error,
      canTopup: usage.canTopup === true,
    }, { status: 429 })
  }

  // Step 3: insert pending conversion row WITH page count, so even if extraction fails, history shows pages
  const convId = await recordConversion(user, file.name, file.size, format)
  if (convId) {
    await updateConversion(convId, { pages: pageCount })
  }

  // Step 4: extract — chunk large PDFs and run chunks in parallel.
  // 55s hard timeout is a last-resort safety net; extractFromPDFChunked is
  // handed an internal deadline well before that (EXTRACTION_BUDGET_MS) so
  // that under a genuine AI-service slowdown it returns whatever succeeded
  // so far instead of the whole conversion getting killed and losing chunks
  // that already completed. 10s buffer keeps room for DB writes + Excel
  // build before Vercel kills the function at maxDuration.
  const tExtract = Date.now()
  const EXTRACTION_BUDGET_MS = 42000
  const extractionDeadline = tExtract + EXTRACTION_BUDGET_MS
  let extracted: ExtractionResult
  try {
    // Both paths get the same deadline — previously only the chunked path
    // had one, so a small PDF whose model cascade ran long was guaranteed
    // to hit the 55s race and fail, while the abandoned Gemini calls kept
    // running (and billing) in the background.
    const extractor = pageCount > CHUNK_THRESHOLD
      ? extractFromPDFChunked(fileBuffer, PAGES_PER_CHUNK, extractionDeadline)
      : extractFromPDF(fileBuffer, false, true, extractionDeadline)

    extracted = await Promise.race([
      extractor,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timed out. Try a smaller PDF or split it into months.')), 55000)
      ),
    ])
    console.log(`[convert] extraction: ${Date.now() - tExtract}ms (${extracted.transactions.length} tx, ${pageCount} pages${extracted.warning ? ', PARTIAL' : ''})`)
  } catch (err: any) {
    console.error(`[convert] extraction failed after ${Date.now() - tExtract}ms:`, err.message)
    await updateConversion(convId, {
      status: 'failed',
      error_message: String(err.message || err).slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: err.message || 'Could not read this PDF.' }, { status: 500 })
  }

  if (!extracted.transactions.length) {
    await updateConversion(convId, {
      status: 'failed',
      error_message: 'No transactions detected. Make sure this is a real bank statement.',
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({
      error: 'No transactions found. Make sure this is a real bank statement (not an account summary or PIN mailer).'
    }, { status: 422 })
  }

  const merged = mergeAndClean([extracted])
  // mergeAndClean builds a fresh { meta, transactions } object and doesn't
  // know about `.warning` — carry it over so a partial-extraction notice
  // set upstream (extractFromPDFChunked) isn't silently dropped here.
  if (extracted.warning) merged.warning = extracted.warning

  // Last-resort bank name from filename if AI + IFSC both failed.
  if (!merged.meta.bank_name) {
    const fromName = bankNameFromFilename(file.name)
    if (fromName) {
      merged.meta.bank_name = fromName
      console.log(`[convert] bank name resolved from filename: ${fromName}`)
    }
  }

  // Sanity check: low transaction density usually means we missed something.
  // Log it (don't fail) so we can monitor extraction quality across users.
  const txPerPage = merged.transactions.length / Math.max(pageCount, 1)
  if (txPerPage < 1 && pageCount >= 2) {
    console.warn(`[convert] LOW DENSITY WARNING: ${merged.transactions.length} tx across ${pageCount} pages (${txPerPage.toFixed(2)}/page) — may have missed rows`)
  }

  const brandName = brandFromForm || usage.brandName

  let outputBuffer: Buffer
  try {
    if (format === 'excel') {
      outputBuffer = await generateExcel(merged.transactions, merged.meta, { brandName, warning: merged.warning })
    } else if (format === 'csv') {
      outputBuffer = Buffer.from(toCSV(merged.transactions), 'utf8')
    } else if (format === 'json') {
      outputBuffer = Buffer.from(toJSON(merged.transactions, merged.meta, merged.warning), 'utf8')
    } else {
      outputBuffer = Buffer.from(toTallyXML(merged.transactions, merged.meta), 'utf8')
    }
  } catch (err: any) {
    await updateConversion(convId, {
      status: 'failed',
      error_message: 'Failed to build output file: ' + (err.message || ''),
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: 'Failed to build output file.' }, { status: 500 })
  }

  const processingTime = Date.now() - startTime
  let totalDebit = 0, totalCredit = 0
  for (const t of merged.transactions) {
    if (t.debit) totalDebit += t.debit
    if (t.credit) totalCredit += t.credit
  }

  await updateConversion(convId, {
    status: 'success',
    pages: pageCount,
    transactions_extracted: merged.transactions.length,
    processing_time_ms: processingTime,
    bank_name: merged.meta.bank_name,
    total_debit: totalDebit,
    total_credit: totalCredit,
    transactions_json: { meta: merged.meta, transactions: merged.transactions },
    completed_at: new Date().toISOString(),
  })

  if (usage.ownerId) {
    await consumePages(usage.ownerId, pageCount, !!usage.useDayPass)
  }

  const baseFilename = file.name.replace(/\.pdf$/i, '')
  const { mime, ext } = FORMAT_INFO[format]
  const filename = `${baseFilename}_bankxl.${ext}`

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Transactions-Count': String(merged.transactions.length),
    'X-Pages-Count': String(pageCount),
    'X-Processing-Time': String(processingTime),
    'X-Bank-Name': merged.meta.bank_name || '',
    'X-Conversion-Id': convId || '',
    'Cache-Control': 'no-store',
  }
  if (merged.warning) {
    headers['X-Extraction-Warning'] = encodeURIComponent(merged.warning)
  }

  return new NextResponse(new Uint8Array(outputBuffer), { status: 200, headers })
}
