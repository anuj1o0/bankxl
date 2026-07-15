import { NextRequest, NextResponse } from 'next/server'
import { extractFromPDF } from '@/lib/gemini'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import { getUser, getOwnedPendingConversion, PAGES_PER_CHUNK } from '../pipeline'

// Step 2 of the chunked conversion flow: extract ONE chunk (≤ 6 pages).
//
// Each chunk gets its own serverless invocation with its own 60s budget —
// this is the entire point of the flow. A chunk that needs the full model
// cascade plus a retry backoff has ~50s of room here, versus the old
// architecture where 30 chunks raced each other inside one shared 42s
// budget and losers were dropped or the whole conversion died.
export const maxDuration = 60
export const runtime = 'nodejs'

// A chunk request costs us real Gemini money, so it must be tied to a live
// conversion this user started via /start (ownership + pending status +
// freshness are all checked). Chunk size is capped so the endpoint can't be
// used to smuggle a whole statement through one "chunk".
const MAX_CHUNK_PAGES = PAGES_PER_CHUNK + 2
const MAX_CHUNK_BYTES = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to convert.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const chunkFile = formData.get('chunk') as File | null
  const conversionId = (formData.get('conversionId') as string) || ''
  const attempt = parseInt((formData.get('attempt') as string) || '0', 10) || 0
  const chunkIndex = parseInt((formData.get('chunkIndex') as string) || '0', 10) || 0

  if (!chunkFile) return NextResponse.json({ error: 'No chunk received.' }, { status: 400 })
  if (chunkFile.size > MAX_CHUNK_BYTES) {
    return NextResponse.json({ error: 'Chunk too large.' }, { status: 400 })
  }

  const owned = await getOwnedPendingConversion(user, conversionId)
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status })
  }

  const buf = Buffer.from(await chunkFile.arrayBuffer())
  try {
    const info = await validatePdf(buf)
    if (info.pageCount > MAX_CHUNK_PAGES) {
      return NextResponse.json({ error: `Chunk has ${info.pageCount} pages — max ${MAX_CHUNK_PAGES}.` }, { status: 400 })
    }
  } catch (e: any) {
    const msg = e instanceof PdfValidationError ? e.userMessage : 'Could not read chunk PDF.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Cost gate: first attempt uses the cheap Flash models only. The expensive
  // gemini-2.5-pro is unlocked only on retry (attempt ≥ 1) — the client
  // orchestrator additionally caps total expensive retries per document,
  // mirroring the old MAX_EXPENSIVE_RETRIES behavior.
  const allowExpensiveModel = attempt >= 1
  const t0 = Date.now()
  try {
    const result = await extractFromPDF(buf, /* skipRpmRetry */ false, allowExpensiveModel, Date.now() + 50000)
    console.log(`[chunk] conv=${conversionId || 'dev'} idx=${chunkIndex} attempt=${attempt} ok: ${result.transactions.length} tx in ${Date.now() - t0}ms`)
    return NextResponse.json({ meta: result.meta, transactions: result.transactions })
  } catch (err: any) {
    const msg = String(err?.message || err)
    console.warn(`[chunk] conv=${conversionId || 'dev'} idx=${chunkIndex} attempt=${attempt} failed after ${Date.now() - t0}ms: ${msg.slice(0, 160)}`)
    // 502 signals "retryable" to the orchestrator; 4xx from above are final.
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
