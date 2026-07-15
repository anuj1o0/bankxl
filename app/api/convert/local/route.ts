import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import { parseStatement, ParserError, toLegacyTransactions, toLegacyMeta } from '@/lib/parser'
import {
  getUser, checkUsage, recordConversion, updateConversion, consumePages, isValidFormat,
} from '../pipeline'

// Deterministic-engine-only conversion endpoint. No AI, no external calls:
// the whole pipeline runs in-process in well under the window regardless of
// page count, so this route serves ANY size PDF in one request.
//
// Contract with the client orchestrator (lib/convert-client.ts): it tries
// this endpoint FIRST for every PDF. Engine failures return 422 with
// { code: 'PARSER_UNSUPPORTED', reason } and the client falls back to the
// existing flow — auth/quota/validation errors keep their proper statuses
// and do NOT fall through. With PARSER_ONLY=true there is no fallback tier;
// the client surfaces this endpoint's failure directly (the pure no-LLM end
// state, flipped by env var once coverage is proven).
//
// Billing/history: pages are consumed and a conversion row is written ONLY
// on success — a fallback must not leave a failed row in the user's history
// or double-charge when the fallback tier succeeds.
export const maxDuration = 30
export const runtime = 'nodejs'

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

  let pageCount: number
  try {
    const info = await validatePdf(fileBuffer)
    pageCount = info.pageCount
  } catch (e: any) {
    if (e instanceof PdfValidationError) {
      return NextResponse.json({ error: e.userMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not read PDF. Make sure the file is a valid, unlocked PDF.' }, { status: 400 })
  }

  const usage = await checkUsage(user, format, pageCount)
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.error, canTopup: usage.canTopup === true }, { status: 429 })
  }

  // PARSER_ONLY=true is the pure-engine end state: engine failures become
  // final user-facing errors instead of PARSER_UNSUPPORTED fallback signals.
  const parserOnly = process.env.PARSER_ONLY === 'true'
  const decline = (reason: string) =>
    NextResponse.json(
      parserOnly
        ? { error: "This statement format isn't supported yet. Email the PDF's bank name to support@banlxlai.com and we'll add it." }
        : { error: 'This statement needs the extended conversion pipeline.', code: 'PARSER_UNSUPPORTED', reason },
      { status: 422 }
    )

  // Run the engine BEFORE creating any conversion row.
  let parsed: Awaited<ReturnType<typeof parseStatement>>
  try {
    parsed = await parseStatement(fileBuffer)
  } catch (err) {
    const shape = ParserError.isParserError(err)
      ? err.toShape()
      : { code: 'INTERNAL' as const, message: String((err as Error)?.message ?? err), stage: 'pdf-extraction' as const, details: {} }
    console.warn(`[convert:local] engine declined ${file.name} (${pageCount}p): ${shape.code} @ ${shape.stage} — ${shape.message}`)
    return decline(shape.code)
  }

  if (parsed.validation.verdict === 'fail') {
    console.warn(
      `[convert:local] engine result rejected by validator for ${file.name}: ` +
        `${parsed.validation.reconciliation.reconciledLinks}/${parsed.validation.reconciliation.checkableLinks} reconciled`
    )
    return decline('VALIDATION_FAILED')
  }

  const transactions = toLegacyTransactions(parsed.transactions)
  const meta = toLegacyMeta(parsed.meta)
  const brandName = brandFromForm || usage.brandName

  // Balance-chain breaks are worth surfacing to the user even on 'warn'.
  const breaks = parsed.validation.reconciliation.breaks.length
  const warning =
    parsed.validation.verdict === 'warn' && breaks > 0
      ? `${breaks} balance mismatch(es) were detected while cross-checking this statement — the flagged rows may need a manual look.`
      : undefined

  let outputBuffer: Buffer
  try {
    if (format === 'excel') {
      outputBuffer = await generateExcel(transactions, meta, { brandName, warning })
    } else if (format === 'csv') {
      outputBuffer = Buffer.from(toCSV(transactions), 'utf8')
    } else if (format === 'json') {
      outputBuffer = Buffer.from(toJSON(transactions, meta, warning), 'utf8')
    } else {
      outputBuffer = Buffer.from(toTallyXML(transactions, meta), 'utf8')
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to build output file.' }, { status: 500 })
  }

  // Success: NOW record history + consume pages.
  const convId = await recordConversion(user, file.name, file.size, format)
  const processingTime = Date.now() - startTime
  let totalDebit = 0
  let totalCredit = 0
  for (const t of transactions) {
    if (t.debit) totalDebit += t.debit
    if (t.credit) totalCredit += t.credit
  }
  await updateConversion(convId, {
    status: 'success',
    pages: pageCount,
    transactions_extracted: transactions.length,
    processing_time_ms: processingTime,
    bank_name: meta.bank_name,
    total_debit: totalDebit,
    total_credit: totalCredit,
    transactions_json: { meta, transactions },
    completed_at: new Date().toISOString(),
  })
  // Parser audit fields go in a SEPARATE update: until the Supabase columns
  // exist (see migration in module notes) this update fails harmlessly
  // without taking the status/history update down with it.
  await updateConversion(convId, {
    parser_tier: 'deterministic',
    parser_version: parsed.parserVersion,
    parser_confidence: Number(parsed.confidence.toFixed(3)),
  })
  if (usage.ownerId) {
    await consumePages(usage.ownerId, pageCount, !!usage.useDayPass)
  }

  const baseFilename = file.name.replace(/\.pdf$/i, '')
  const { mime, ext } = FORMAT_INFO[format]
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${baseFilename}_bankxl.${ext}"`,
    'X-Transactions-Count': String(transactions.length),
    'X-Pages-Count': String(pageCount),
    'X-Processing-Time': String(processingTime),
    'X-Bank-Name': meta.bank_name || '',
    'X-Conversion-Id': convId || '',
    'X-Parser-Tier': 'deterministic',
    'X-Parser-Version': parsed.parserVersion,
    'Cache-Control': 'no-store',
  }
  if (warning) headers['X-Extraction-Warning'] = encodeURIComponent(warning)

  console.log(
    `[convert:local] ${file.name}: ${transactions.length} tx, ${pageCount}p, verdict=${parsed.validation.verdict}, ${processingTime}ms`
  )
  return new NextResponse(new Uint8Array(outputBuffer), { status: 200, headers })
}
