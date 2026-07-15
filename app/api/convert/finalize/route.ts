import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { mergeAndClean, ExtractionResult, Transaction, StatementMeta } from '@/lib/gemini'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'
import { bankNameFromFilename } from '@/lib/normalize'
import {
  getUser, getOwnedPendingConversion, getEffectiveOwner, updateConversion,
  consumePages, isValidFormat,
} from '../pipeline'

// Step 3 of the chunked conversion flow: merge chunk results, build the
// output file, settle billing and history.
//
// The chunk results arrive from the client — which is fine: they're the
// user's own statement data, extracted moments ago by /chunk on their own
// conversion. Fabricating them only corrupts the user's own output file.
// What we do NOT trust the client for: page count (billed from the
// conversion row recorded at /start) and format entitlement (re-checked
// against the profile here).
export const maxDuration = 60
export const runtime = 'nodejs'

interface FinalizeBody {
  conversionId?: string
  format?: string
  brandName?: string
  filename?: string
  results?: { meta?: Partial<StatementMeta>; transactions?: Transaction[] }[]
  missingPages?: number
  totalPages?: number
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to convert.' }, { status: 401 })
  }

  let body: FinalizeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const format: ExportFormat = isValidFormat(body.format) ? body.format : 'excel'
  const conversionId = body.conversionId || ''

  const owned = await getOwnedPendingConversion(user, conversionId)
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }
  const row = owned.row // null in dev mode
  const pageCount: number = row?.pages ?? body.totalPages ?? 1
  const sourceFilename: string = row?.filename ?? body.filename ?? 'statement.pdf'

  const rawResults = Array.isArray(body.results) ? body.results : []
  const results: ExtractionResult[] = rawResults.map(r => ({
    meta: { ...(r.meta ?? {}) } as StatementMeta,
    transactions: Array.isArray(r.transactions) ? r.transactions : [],
  }))

  const merged = mergeAndClean(results)

  if (!merged.transactions.length) {
    await updateConversion(conversionId || null, {
      status: 'failed',
      error_message: 'No transactions detected. Make sure this is a real bank statement.',
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({
      error: 'No transactions found. Make sure this is a real bank statement (not an account summary or PIN mailer).'
    }, { status: 422 })
  }

  // Partial-extraction warning: mirror of the legacy chunked path's message.
  const missingPages = Math.max(0, Math.min(body.missingPages ?? 0, pageCount))
  if (missingPages > 0) {
    merged.warning = `AI service congestion meant roughly ${missingPages} page(s) out of ${pageCount} could not be confirmed in time. The transactions below are real, but this statement may be incomplete — re-upload to retry if the numbers look short.`
  }

  if (!merged.meta.bank_name) {
    const fromName = bankNameFromFilename(sourceFilename)
    if (fromName) merged.meta.bank_name = fromName
  }

  // Re-check format entitlement + resolve billing owner. Day passes are
  // intentionally not consulted here (0 sold to date) — the monthly
  // allowance path is what real users are on; the legacy route still
  // handles day passes for small PDFs.
  let ownerId: string | null = null
  let brandName: string | undefined = body.brandName || undefined
  if (!user.isDev) {
    try {
      const { createServiceSupabase } = await import('@/lib/supabase-server')
      const { isFormatAllowed } = await import('@/lib/supabase')
      const sb = createServiceSupabase()
      const eff = await getEffectiveOwner(user.id, sb)
      if (eff) {
        ownerId = eff.ownerId
        if (!isFormatAllowed(eff.profile.plan, format)) {
          return NextResponse.json({ error: `${format.toUpperCase()} export needs Pro. Upgrade for ₹499/mo to unlock all formats.` }, { status: 429 })
        }
        if (!brandName && eff.profile.plan === 'firm') brandName = eff.profile.brand_name
      }
    } catch (e: any) {
      console.error('[finalize] owner lookup failed:', e?.message)
    }
  }

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
    await updateConversion(conversionId || null, {
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

  await updateConversion(conversionId || null, {
    status: 'success',
    transactions_extracted: merged.transactions.length,
    processing_time_ms: processingTime,
    bank_name: merged.meta.bank_name,
    total_debit: totalDebit,
    total_credit: totalCredit,
    transactions_json: { meta: merged.meta, transactions: merged.transactions },
    completed_at: new Date().toISOString(),
  })

  if (ownerId) {
    await consumePages(ownerId, pageCount, false)
  }

  const baseFilename = sourceFilename.replace(/\.pdf$/i, '')
  const { mime, ext } = FORMAT_INFO[format]
  const filename = `${baseFilename}_bankxl.${ext}`

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Transactions-Count': String(merged.transactions.length),
    'X-Pages-Count': String(pageCount),
    'X-Processing-Time': String(processingTime),
    'X-Bank-Name': merged.meta.bank_name || '',
    'X-Conversion-Id': conversionId || '',
    'Cache-Control': 'no-store',
  }
  if (merged.warning) {
    headers['X-Extraction-Warning'] = encodeURIComponent(merged.warning)
  }

  return new NextResponse(new Uint8Array(outputBuffer), { status: 200, headers })
}
