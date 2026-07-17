'use client'
/**
 * lib/convert-client.ts — browser-side conversion orchestrator.
 *
 * Small PDFs (≤ CHUNK_THRESHOLD pages) go through the legacy single-request
 * endpoint — one call, fastest possible path.
 *
 * Large PDFs use the chunked flow:
 *   1. POST /api/convert/start   — validate + quota + conversion row, once.
 *   2. Split the PDF locally (pdf-lib, dynamic import) into 6-page chunks.
 *   3. POST /api/convert/chunk   — one serverless invocation per chunk,
 *      CONCURRENCY at a time, with per-chunk retries. Each chunk gets its
 *      own 60s budget, so a 178-page statement is no longer racing thirty
 *      Gemini calls inside one shared window.
 *   4. POST /api/convert/finalize — merge, build the file, settle billing.
 *
 * Why the browser orchestrates: it already holds the file (no server-side
 * storage needed), the whole flow stays on the Vercel Hobby plan, and a
 * failed chunk can be retried patiently instead of against a dying clock.
 */

export type ClientFormat = 'excel' | 'csv' | 'json' | 'tally'

export interface ConvertProgress {
  phase: 'uploading' | 'extracting' | 'building'
  chunksDone?: number
  chunksTotal?: number
}

export interface ConvertOutput {
  blob: Blob
  filenameOut: string
  txCount: number
  pages: number
  bank: string
  warning?: string
  conversionId: string
  timeMs: number
}

export class ConvertError extends Error {
  canTopup: boolean
  constructor(message: string, canTopup = false) {
    super(message)
    this.name = 'ConvertError'
    this.canTopup = canTopup
  }
}

// Mirrors of app/api/convert/pipeline.ts — keep in sync. (The server's
// /start response is authoritative for pagesPerChunk; the constant here is
// only the fallback.)
const CHUNK_THRESHOLD = 3
const PAGES_PER_CHUNK = 3
const CONCURRENCY = 5
const MAX_ATTEMPTS_PER_CHUNK = 3   // 1 cheap attempt + up to 2 retries
const MAX_EXPENSIVE_TOTAL = 8      // retries allowed to touch gemini-2.5-pro, per document

const EXT: Record<ClientFormat, string> = { excel: 'xlsx', csv: 'csv', json: 'json', tally: 'xml' }

function outName(file: File, format: ClientFormat): string {
  return file.name.replace(/\.pdf$/i, '') + '_bankxl.' + EXT[format]
}

async function readError(res: Response): Promise<ConvertError> {
  const data = await res.json().catch(() => ({} as any))
  return new ConvertError(data.error || `Conversion failed (${res.status}).`, !!data.canTopup)
}

function parseOutputResponse(res: Response, blob: Blob, file: File, format: ClientFormat, t0: number): ConvertOutput {
  const warningHeader = res.headers.get('X-Extraction-Warning')
  return {
    blob,
    filenameOut: outName(file, format),
    txCount: parseInt(res.headers.get('X-Transactions-Count') || '0'),
    pages: parseInt(res.headers.get('X-Pages-Count') || '1'),
    bank: res.headers.get('X-Bank-Name') || '',
    warning: warningHeader ? decodeURIComponent(warningHeader) : undefined,
    conversionId: res.headers.get('X-Conversion-Id') || '',
    timeMs: Date.now() - t0,
  }
}

// ─── Legacy single-request path (small PDFs, and fallback) ──────────────────
async function convertLegacy(file: File, format: ClientFormat, brandName: string | undefined, t0: number): Promise<ConvertOutput> {
  const formData = new FormData()
  formData.append('pdf', file)
  formData.append('format', format)
  if (brandName) formData.append('brandName', brandName)
  const res = await fetch('/api/convert', { method: 'POST', body: formData })
  if (!res.ok) throw await readError(res)
  const blob = await res.blob()
  return parseOutputResponse(res, blob, file, format, t0)
}

// ─── Chunked path ────────────────────────────────────────────────────────────
interface ChunkResult { meta: any; transactions: any[] }

async function splitIntoChunks(bytes: ArrayBuffer, pagesPerChunk: number): Promise<Blob[]> {
  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const totalPages = src.getPageCount()
  const chunks: Blob[] = []
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages)
    const out = await PDFDocument.create()
    const indices = Array.from({ length: end - start }, (_, i) => start + i)
    const copied = await out.copyPages(src, indices)
    copied.forEach(p => out.addPage(p))
    const saved = await out.save()
    chunks.push(new Blob([saved as unknown as BlobPart], { type: 'application/pdf' }))
  }
  return chunks
}

async function postChunk(chunk: Blob, conversionId: string, chunkIndex: number, attempt: number): Promise<ChunkResult> {
  const formData = new FormData()
  formData.append('chunk', new File([chunk], `chunk-${chunkIndex}.pdf`, { type: 'application/pdf' }))
  formData.append('conversionId', conversionId)
  formData.append('chunkIndex', String(chunkIndex))
  formData.append('attempt', String(attempt))
  const res = await fetch('/api/convert/chunk', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await readError(res)
    // 502 = extraction hiccup, retryable. 4xx = final (bad chunk/expired conversion).
    ;(err as any).retryable = res.status === 502
    throw err
  }
  return res.json()
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function convertPdf(
  file: File,
  format: ClientFormat,
  opts: { brandName?: string; onProgress?: (p: ConvertProgress) => void } = {}
): Promise<ConvertOutput> {
  const t0 = Date.now()
  const { onProgress, brandName } = opts

  // ─── Tier 1: the deterministic engine (fast, free, no AI) ────────────────
  // Every PDF tries /api/convert/local first — any size, one request,
  // seconds. Only a typed PARSER_UNSUPPORTED decline falls through to the
  // extended flow; auth, quota, and validation errors are final either way.
  onProgress?.({ phase: 'uploading' })
  const localForm = new FormData()
  localForm.append('pdf', file)
  localForm.append('format', format)
  if (brandName) localForm.append('brandName', brandName)
  let localRes: Response | null = null
  try {
    localRes = await fetch('/api/convert/local', { method: 'POST', body: localForm })
  } catch {
    localRes = null // network blip — the fallback tiers get their own try
  }
  if (localRes) {
    if (localRes.ok) {
      onProgress?.({ phase: 'building' })
      const blob = await localRes.blob()
      return parseOutputResponse(localRes, blob, file, format, t0)
    }
    const data = await localRes.json().catch(() => ({}) as { error?: string; code?: string; canTopup?: boolean })
    const fallbackEligible = localRes.status === 422 && data?.code === 'PARSER_UNSUPPORTED'
    if (!fallbackEligible) {
      throw new ConvertError(data?.error || `Conversion failed (${localRes.status}).`, !!data?.canTopup)
    }
  }

  // ─── Tier 2: the extended pipeline ───────────────────────────────────────
  // Count pages locally to pick the path. If pdf-lib can't read it in the
  // browser for any reason, the server-side legacy route is the fallback —
  // it has richer validation and friendlier error messages.
  let bytes: ArrayBuffer
  let pageCount: number
  try {
    bytes = await file.arrayBuffer()
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true })
    pageCount = doc.getPageCount()
  } catch {
    return convertLegacy(file, format, brandName, t0)
  }

  if (pageCount <= CHUNK_THRESHOLD) {
    return convertLegacy(file, format, brandName, t0)
  }

  // 1. Start — validate + quota + conversion row.
  onProgress?.({ phase: 'uploading' })
  const startForm = new FormData()
  startForm.append('pdf', file)
  startForm.append('format', format)
  const startRes = await fetch('/api/convert/start', { method: 'POST', body: startForm })
  if (!startRes.ok) throw await readError(startRes)
  const plan = await startRes.json() as { conversionId: string | null; pageCount: number; pagesPerChunk: number }
  const conversionId = plan.conversionId || ''

  // 2. Split locally.
  const chunks = await splitIntoChunks(bytes, plan.pagesPerChunk || PAGES_PER_CHUNK)
  const total = chunks.length
  let done = 0
  onProgress?.({ phase: 'extracting', chunksDone: 0, chunksTotal: total })

  // 3. Process chunks: CONCURRENCY workers over a shared queue, retries per
  // chunk. First attempt is cheap-models-only; a retry may use the
  // expensive model, bounded by MAX_EXPENSIVE_TOTAL across the document.
  const results: (ChunkResult | null)[] = new Array(total).fill(null)
  let expensiveUsed = 0
  let nextIndex = 0
  let lastChunkError: ConvertError | null = null

  async function worker() {
    while (true) {
      const i = nextIndex++
      if (i >= total) return
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CHUNK; attempt++) {
        // Retries would normally escalate to the expensive model (server
        // unlocks it for attempt ≥ 1), but that's bounded per document: once
        // the budget is spent, further retries are sent as attempt=0 so the
        // server keeps them on the cheap models.
        let sendAttempt = attempt
        if (attempt >= 1) {
          if (expensiveUsed < MAX_EXPENSIVE_TOTAL) expensiveUsed++
          else sendAttempt = 0
        }
        try {
          results[i] = await postChunk(chunks[i], conversionId, i, sendAttempt)
          break
        } catch (e: any) {
          if (e instanceof ConvertError) lastChunkError = e
          // 4xx server verdicts (bad chunk, expired conversion) are final;
          // 502 extraction hiccups and network errors are worth retrying
          // after a short pause.
          const isFinal = e instanceof ConvertError && (e as any).retryable === false
          if (isFinal) break
          if (attempt < MAX_ATTEMPTS_PER_CHUNK - 1) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
          }
        }
      }
      done++
      onProgress?.({ phase: 'extracting', chunksDone: done, chunksTotal: total })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()))

  const successes = results.filter((r): r is ChunkResult => !!r)
  const failedChunks = total - successes.length
  if (successes.length === 0) {
    // Mark the conversion failed server-side, but surface the CHUNK failure
    // to the user: finalize's "no transactions found" message accuses the
    // document, when the real cause (e.g. AI quota exhausted) came from the
    // chunk calls.
    await fetch('/api/convert/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversionId, format, filename: file.name, results: [], totalPages: plan.pageCount }),
    }).catch(() => undefined)
    throw lastChunkError ?? new ConvertError('Conversion failed — the extraction service did not return any data.')
  }

  // 4. Finalize — merge + build the output file.
  onProgress?.({ phase: 'building', chunksDone: total, chunksTotal: total })
  const finalizeRes = await fetch('/api/convert/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversionId,
      format,
      brandName,
      filename: file.name,
      results: successes,
      missingPages: failedChunks * (plan.pagesPerChunk || PAGES_PER_CHUNK),
      totalPages: plan.pageCount,
    }),
  })
  if (!finalizeRes.ok) throw await readError(finalizeRes)
  const blob = await finalizeRes.blob()
  return parseOutputResponse(finalizeRes, blob, file, format, t0)
}
