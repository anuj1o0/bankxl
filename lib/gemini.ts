/**
 * lib/gemini.ts — bank statement extraction using Google Gemini
 *
 * Model cascade (fastest → most accurate, each with separate quota pool):
 *   1. gemini-2.5-flash-lite  — fastest, cheapest (primary)
 *   2. gemini-2.5-flash       — more accurate  (fallback 1)
 *   3. gemini-2.5-pro         — different model tier entirely (fallback 2 —
 *                               only reached from the sequential retry pass,
 *                               never the parallel pass, to bound cost; see
 *                               allowExpensiveModel below)
 *
 * NOTE: this used to fall back to `gemini-1.5-flash`, which Google has fully
 * retired (returns 404 for every request, not a transient error — confirmed
 * against the live API). If a model in this cascade ever starts 404ing,
 * check `GET /v1beta/models` with your API key for the current list of
 * models supporting generateContent before picking a replacement — don't
 * guess a model name from memory, Google's lineup moves fast.
 *
 * IMPORTANT: Enable Gemini billing at https://aistudio.google.com/app/apikey
 * Free tier: only 20 req/day per model → will hit limit quickly.
 * Paid tier: 1000+ RPM, no daily cap.
 *
 * COST CONTROLS (all three matter — removing any one of them caused a real
 * billing spike in the past):
 *   1. thinkingConfig: thinking tokens are disabled (budget 0) on the Flash
 *      models and minimized (128) on Pro — see thinkingConfigFor().
 *   2. gemini-2.5-pro is retry-pass-only AND capped per document
 *      (MAX_EXPENSIVE_RETRIES).
 *   3. Chunks are 6 pages (route.ts PAGES_PER_CHUNK) — 2-page chunks meant
 *      a 178-page statement fired 89 separate calls.
 */

export interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
  ref_no: string | null
}

export interface StatementMeta {
  bank_name: string | null
  account_holder: string | null
  account_no: string | null
  ifsc: string | null
  period_from: string | null
  period_to: string | null
  opening_balance: number | null
  closing_balance: number | null
  currency: string
  total_pages: number | null
}

export interface ExtractionResult {
  meta: StatementMeta
  transactions: Transaction[]
  // Set when a chunked extraction couldn't confirm every page — either a
  // chunk kept failing after retry, or the extraction deadline was reached
  // first. The result is still real data, just possibly incomplete; the
  // caller (route.ts) surfaces this to the user rather than presenting a
  // partial statement as if it were the whole thing.
  warning?: string
}

const MODEL_FAST     = 'gemini-2.5-flash-lite'  // primary — fastest
const MODEL_ACCURATE = 'gemini-2.5-flash'         // fallback 1
const MODEL_LEGACY   = 'gemini-2.5-pro'            // fallback 2 — different tier/quota pool

const BASE             = 'https://generativelanguage.googleapis.com/v1beta'
const INLINE_THRESHOLD = 7 * 1024 * 1024  // 7 MB — use inline below this
const MAX_OUTPUT_TOKENS = 65536            // max for all Flash models

// Gemini 2.5 models "think" by default: internal reasoning tokens that are
// billed as OUTPUT tokens (the expensive direction) and add anywhere from a
// few to tens of seconds of latency per call. For structured extraction —
// fixed JSON schema, temperature 0, "copy the rows you see" — thinking adds
// no accuracy, but it was silently multiplying both the bill and the
// latency (slow calls → timeouts → cascade to pricier models → more
// thinking). flash and flash-lite accept thinkingBudget: 0 (fully off);
// pro cannot be disabled below its minimum of 128.
function thinkingConfigFor(model: string): { thinkingBudget: number } {
  return { thinkingBudget: model === MODEL_LEGACY ? 128 : 0 }
}

// Per-request fetch timeouts. These are UPPER bounds — every call is also
// clamped to whatever remains of the extraction deadline, so a fetch can
// never outlive the budget the route gave us (previously each fetch had a
// flat 50s timeout against a 42s total budget, so one slow call could
// swallow the whole conversion).
const SINGLE_CALL_TIMEOUT_MS = 45000  // whole-PDF calls (small statements)
const CHUNK_CALL_TIMEOUT_MS  = 30000  // per-chunk calls (6 pages each)
// Portion of the budget the parallel pass must leave for sequential retries.
// Without this the parallel pass could run to the full deadline, and any
// chunk that failed had zero time left to be retried — a partial result that
// was entirely avoidable.
const RETRY_RESERVE_MS = 15000

// ─── Indian bank name hints for better detection ──────────────────────────────
const BANK_HINTS = `
Major Indian banks (detect from header/logo/letterhead/IFSC prefix):
SBI/State Bank of India (SBIN), HDFC Bank (HDFC), ICICI Bank (ICIC),
Axis Bank (UTIB), Kotak Mahindra Bank (KKBK), Punjab National Bank/PNB (PUNB),
Bank of Baroda (BARB), Canara Bank (CNRB), Union Bank of India (UBIN),
Bank of India (BKID), Central Bank of India (CBIN), Indian Bank (IDIB),
IDFC First Bank (IDFB), IndusInd Bank (INDB), Yes Bank (YESB),
Federal Bank (FDRL), Karnataka Bank (KARB), South Indian Bank (SIBL),
RBL Bank (RATN), DCB Bank (DCBL), Bandhan Bank (BDBL),
AU Small Finance Bank (AUBL), Ujjivan Small Finance Bank (UJVN),
IDBI Bank (IBKL), Bank of Maharashtra (MAHB), UCO Bank (UCBA),
Punjab & Sind Bank (PSIB), Indian Overseas Bank (IOBA).
Also detect: credit card statements (Amex, SBI Card, HDFC Credit Card, etc.)`.trim()

const PROMPT = `Extract all data from this bank statement PDF.
Return ONLY a single valid JSON object — no markdown, no code fences, no explanation.

${BANK_HINTS}

Schema (every key required, use null if unknown):
{
  "meta": {
    "bank_name": "Full bank name (look in header, footer, watermark, letterhead — use IFSC prefix if needed)",
    "account_holder": "string|null",
    "account_no": "string|null",
    "ifsc": "string|null",
    "period_from": "YYYY-MM-DD|null",
    "period_to": "YYYY-MM-DD|null",
    "opening_balance": number|null,
    "closing_balance": number|null,
    "currency": "INR",
    "total_pages": number|null
  },
  "transactions": [
    {"date":"YYYY-MM-DD","description":"string","debit":number|null,"credit":number|null,"balance":number|null,"ref_no":"string|null"}
  ]
}

Rules:
- Amounts: plain numbers only, no commas, no currency symbols. E.g. 12400.50 not "12,400.50".
- Dates: YYYY-MM-DD always. If year is missing, infer from statement period.
- Debit (Dr/Withdrawal/Debit): debit=amount, credit=null.
- Credit (Cr/Deposit/Credit): credit=amount, debit=null.
- ref_no: UPI ref / UTR / cheque number / IMPS ref.
- SKIP: header rows, page totals, "Brought Forward", "Carried Forward", opening/closing balance rows.
- bank_name: NEVER return null or "Unknown". If you cannot determine the bank, return your best guess based on IFSC, logo, or format.
- Include EVERY transaction across ALL pages. Do not truncate.
- Default currency to INR for Indian banks.`

const EMPTY_META: StatementMeta = {
  bank_name: null, account_holder: null, account_no: null, ifsc: null,
  period_from: null, period_to: null, opening_balance: null, closing_balance: null,
  currency: 'INR', total_pages: null,
}

// ─── Model circuit breaker ────────────────────────────────────────────────────
// A statement is usually split into many parallel chunks (extractFromPDFChunked),
// all of which race to the same model cascade at once. Under a real Gemini
// capacity crunch, every chunk independently rediscovers "flash-lite is 503
// right now" via its own trial and error — wasteful, and it eats into the
// 55s route-level budget. This map remembers which models recently 503'd so
// later chunks (and the sequential retry pass) can skip straight past them
// instead of re-attempting a model that's very likely still overloaded a
// second later. Module-scoped, so it also persists across requests within
// the same warm serverless instance.
const modelCooldownUntil = new Map<string, number>()
const MODEL_COOLDOWN_MS = 20000

function isModelCoolingDown(model: string): boolean {
  const until = modelCooldownUntil.get(model)
  return typeof until === 'number' && Date.now() < until
}
function markModelOverloaded(model: string) {
  modelCooldownUntil.set(model, Date.now() + MODEL_COOLDOWN_MS)
}

// Small per-chunk delay before a parallel chunk fires its first request, so
// the circuit breaker above gets a chance to help later chunks instead of
// every chunk in a batch discovering an overloaded model at the same instant.
// Capped: with many chunks (a 178-page statement is ~30 chunks), an uncapped
// 250ms-per-index stagger would burn 7+ seconds of the extraction budget
// before the last chunk even started.
function staggered<T>(fn: () => Promise<T>, index: number, stepMs = 150, maxDelayMs = 1500): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => { fn().then(resolve, reject) }, Math.min(index * stepMs, maxDelayMs))
  })
}

// Like Promise.allSettled, but if `deadline` passes before every promise has
// settled, resolves immediately with whatever's known so far instead of
// waiting for the slowest one. Still-pending entries come back as
// `undefined`. Without this, one chunk stuck deep in a model cascade during
// a real Gemini slowdown can block the entire parallel pass well past the
// route's time budget, discarding every chunk that DID finish in time.
function allSettledByDeadline<T>(
  promises: Promise<T>[],
  deadline?: number
): Promise<(PromiseSettledResult<T> | undefined)[]> {
  const results: (PromiseSettledResult<T> | undefined)[] = new Array(promises.length)
  let remaining = promises.length
  return new Promise(resolve => {
    let done = false
    const finish = () => { if (!done) { done = true; resolve(results) } }
    if (remaining === 0) { finish(); return }
    promises.forEach((p, i) => {
      p.then(
        value => { results[i] = { status: 'fulfilled', value }; if (--remaining === 0) finish() },
        reason => { results[i] = { status: 'rejected', reason }; if (--remaining === 0) finish() }
      )
    })
    if (deadline) {
      const msLeft = deadline - Date.now()
      setTimeout(finish, Math.max(msLeft, 0))
    }
  })
}

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Retries on RPM (per-minute) 429s with a short backoff — just enough to
// smooth over a momentary burst. Deliberately short: each model in the
// cascade has its own quota pool, so once a request is actually rate-limited
// it's faster and just as likely to succeed by moving to the next model
// than by waiting on the same one — and with a 55s route-level budget, a
// long wait here starves the rest of the cascade.
// Does NOT retry RPD (daily quota exhausted) — those need a model switch.
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 3000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const msg = String(err?.message || '')
      const isRpm  = /busy|rate.?limit|resource.?exhausted|quota/i.test(msg) && !/daily|per.?day|rpd/i.test(msg)
      const isDone = attempt >= retries
      if (isRpm && !isDone) {
        console.warn(`[gemini] RPM limit hit, waiting ${delayMs/1000}s before retry ${attempt + 1}…`)
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Gemini: max retries exceeded')
}

// ─── Transient network-error retry ───────────────────────────────────────────
// Wraps fetch calls. Retries on ECONNRESET, fetch failed, network errors, and
// 502/504 (genuine transient gateway blips worth retrying on the SAME
// endpoint). Deliberately does NOT retry 503 here — Gemini uses 503
// specifically to mean "this model is overloaded", and the fix for that is
// switching to a different model (separate capacity), not hammering the
// same overloaded one. 503s are returned as-is so the caller throws
// immediately and the model cascade picks the next model right away.
async function fetchWithRetry(url: string, init: RequestInit, label: string, retries = 2): Promise<Response> {
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      // Retry transient gateway errors (not 503 — see comment above)
      if (res.status === 502 || res.status === 504) {
        if (attempt < retries) {
          const wait = 800 * (attempt + 1)
          console.warn(`[gemini] ${label} got ${res.status}, retrying in ${wait}ms…`)
          await new Promise(r => setTimeout(r, wait))
          continue
        }
      }
      return res
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || err)
      const isAbort = err?.name === 'AbortError' || /aborted|timeout/i.test(msg)
      const isNetwork = /econnreset|enotfound|fetch failed|network|socket hang up/i.test(msg)
      // Don't retry user-initiated aborts (AbortSignal.timeout firing)
      if (isAbort) throw err
      if (isNetwork && attempt < retries) {
        const wait = 600 * (attempt + 1)
        console.warn(`[gemini] ${label} network error (${msg.slice(0, 80)}), retrying in ${wait}ms…`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
  throw lastErr ?? new Error(`${label}: max retries exceeded`)
}

// ─── Detect if error is a daily (RPD) exhaustion ─────────────────────────────
function isDailyLimitError(msg: string): boolean {
  return /daily.?limit|quota.?exceeded|resource.?exhausted|per.?day/i.test(msg)
}

// ─── Inline call (PDF < 7 MB) ─────────────────────────────────────────────────
async function callGeminiInline(pdfBuffer: Buffer, apiKey: string, model: string, timeoutMs: number = SINGLE_CALL_TIMEOUT_MS): Promise<ExtractionResult> {
  const t0 = Date.now()
  const res = await fetchWithRetry(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { text: PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        thinkingConfig: thinkingConfigFor(model),
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }, `${model} inline`)

  console.log(`[gemini] ${model} inline: ${Date.now() - t0}ms status=${res.status}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    if (res.status === 429 || res.status === 503) throw new Error(`RATE_LIMIT: ${msg}`)
    if (res.status === 400) throw new Error(`This PDF couldn't be read by AI: ${msg}`)
    throw new Error(`Extraction failed (${res.status}): ${msg}`)
  }
  return parseResponse(await res.json(), model)
}

// ─── File API call (PDF ≥ 7 MB) ───────────────────────────────────────────────
async function uploadToFileAPI(pdfBuffer: Buffer, apiKey: string): Promise<string> {
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(pdfBuffer.length),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'statement.pdf' } }),
    }
  )
  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Could not start file upload — check GEMINI_API_KEY.')

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': 'application/pdf',
    },
    body: new Uint8Array(pdfBuffer),
  })
  if (!uploadRes.ok) {
    const txt = await uploadRes.text()
    throw new Error(`File upload failed: ${uploadRes.status} — ${txt.slice(0, 200)}`)
  }
  const fileData = await uploadRes.json()
  const uri = fileData?.file?.uri
  if (!uri) throw new Error('No file URI from Gemini File API')
  return uri
}

async function callGeminiFile(pdfBuffer: Buffer, apiKey: string, model: string, timeoutMs: number = SINGLE_CALL_TIMEOUT_MS): Promise<ExtractionResult> {
  const tUpload = Date.now()
  const fileUri = await uploadToFileAPI(pdfBuffer, apiKey)
  console.log(`[gemini] file upload: ${Date.now() - tUpload}ms`)

  const t0 = Date.now()
  const res = await fetchWithRetry(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
          { text: PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        thinkingConfig: thinkingConfigFor(model),
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }, `${model} file`)

  console.log(`[gemini] ${model} file: ${Date.now() - t0}ms status=${res.status}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    if (res.status === 429 || res.status === 503) throw new Error(`RATE_LIMIT: ${msg}`)
    if (res.status === 400) throw new Error(`This PDF couldn't be read by AI: ${msg}`)
    throw new Error(`Extraction failed (${res.status}): ${msg}`)
  }
  return parseResponse(await res.json(), model)
}

// ─── Split a PDF into N-page chunks ───────────────────────────────────────────
// Returns an array of Buffers, each a valid PDF containing a slice of the input.
// Uses ignoreEncryption so lightly-encrypted (but readable) PDFs still split.
export async function splitPdfIntoChunks(pdfBuffer: Buffer, pagesPerChunk: number): Promise<Buffer[]> {
  const { PDFDocument } = await import('pdf-lib')
  let src: any
  try {
    src = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
  } catch (e: any) {
    throw new Error(`Could not split PDF for parallel processing: ${e?.message || e}`)
  }
  const totalPages = src.getPageCount()

  if (totalPages <= pagesPerChunk) return [pdfBuffer]

  const chunks: Buffer[] = []
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages)
    const out = await PDFDocument.create()
    const indices = Array.from({ length: end - start }, (_, i) => start + i)
    const copied = await out.copyPages(src, indices)
    copied.forEach(p => out.addPage(p))
    const bytes = await out.save()
    chunks.push(Buffer.from(bytes))
  }
  return chunks
}

// ─── Chunked parallel extraction with sequential retry ───────────────────────
// Strategy:
//   1. Split PDF into 2-page chunks (small → ~60-90 tx → ~4K output tokens →
//      responds in 8-15s).
//   2. Fire all chunks in parallel. Most succeed fast.
//   3. Any failed chunks get retried SEQUENTIALLY at the end (no parallel
//      contention, more bandwidth per call). Each retry uses skipRpmRetry=false
//      so it can backoff once if needed.
//
// This way we never silently drop pages — if parallel fails, sequential picks
// it up. Total time for 20-page PDF: ~15-25s (parallel) + ~0-30s (retries).
//
// `deadline` (Date.now()-style timestamp, optional): under a real Gemini
// capacity crunch, retries can legitimately take longer than the route's
// hard timeout has left. Rather than let the whole conversion get killed and
// lose chunks that DID succeed, both the parallel pass and the sequential
// retry loop respect this deadline and return whatever they have — a real,
// if possibly incomplete, statement beats no statement at all. The caller
// (route.ts) is told via `.warning` so it can flag this to the user instead
// of quietly shipping a statement that's missing pages.
export async function extractFromPDFChunked(
  pdfBuffer: Buffer,
  pagesPerChunk: number = 2,
  deadline?: number
): Promise<ExtractionResult> {
  const tSplit = Date.now()
  const chunks = await splitPdfIntoChunks(pdfBuffer, pagesPerChunk)
  console.log(`[gemini] split into ${chunks.length} chunks of ${pagesPerChunk} pages in ${Date.now() - tSplit}ms`)

  if (chunks.length === 1) {
    return extractFromPDF(chunks[0], false, true, deadline)
  }

  // ─── Pass 1: all chunks in parallel ────────────────────────────────────────
  // The parallel pass gets the budget MINUS a reserve for the sequential
  // retry pass. Previously it could run to the full deadline, leaving any
  // failed chunk with zero time to be retried.
  const parallelDeadline = deadline
    ? Math.max(deadline - RETRY_RESERVE_MS, Date.now() + 10000)
    : undefined
  const tPar = Date.now()
  const parallelResults = await allSettledByDeadline(
    chunks.map((c, i) => staggered(() => extractFromPDF(c, /* skipRpmRetry */ true, /* allowExpensiveModel */ false, parallelDeadline), i)),
    parallelDeadline
  )
  console.log(`[gemini] parallel pass: ${Date.now() - tPar}ms`)

  // Treat "succeeded but 0 transactions" as a soft failure — bank statement
  // pages almost always have at least one row, so empty result usually means
  // the lite model misread layout. Retry these with the accurate path.
  const successes: ExtractionResult[] = []
  const needsRetry: number[] = []
  parallelResults.forEach((r, i) => {
    if (!r) {
      needsRetry.push(i)
      console.warn(`[gemini] parallel chunk ${i + 1} still in flight when the parallel pass deadline hit`)
    } else if (r.status === 'rejected') {
      needsRetry.push(i)
      console.warn(`[gemini] parallel chunk ${i + 1} failed: ${String(r.reason?.message || r.reason).slice(0, 120)}`)
    } else if (r.value.transactions.length === 0) {
      needsRetry.push(i)
      console.warn(`[gemini] parallel chunk ${i + 1} returned 0 transactions — will retry`)
    } else {
      successes.push(r.value)
    }
  })

  // ─── Pass 2: sequential retry of failed + empty chunks ─────────────────────
  if (needsRetry.length > 0) {
    console.log(`[gemini] retrying ${needsRetry.length} chunk(s) sequentially…`)
    const tRetry = Date.now()
    const stillFailed: string[] = []
    // gemini-2.5-pro costs far more per token than the Flash models, and
    // every chunk that reaches this retry pass is individually eligible for
    // it. Without a cap, a document that's genuinely hard for the cheap
    // models (many chunks failing at once — a bad scan, an unusual layout)
    // could escalate dozens of chunks to Pro in one conversion, the exact
    // failure mode that spiked the Gemini bill previously. Past this many
    // expensive attempts, remaining retries stay on the cheap models — a
    // lower-confidence result beats an unbounded bill.
    const MAX_EXPENSIVE_RETRIES = 8
    let expensiveRetriesUsed = 0
    let cappedWarningLogged = false
    for (const i of needsRetry) {
      if (deadline && Date.now() > deadline) {
        console.warn(`[gemini] extraction deadline reached — stopping retries early, returning what succeeded so far`)
        break
      }
      const allowExpensive = expensiveRetriesUsed < MAX_EXPENSIVE_RETRIES
      if (allowExpensive) {
        expensiveRetriesUsed++
      } else if (!cappedWarningLogged) {
        cappedWarningLogged = true
        console.warn(`[gemini] hit MAX_EXPENSIVE_RETRIES (${MAX_EXPENSIVE_RETRIES}) for this document — remaining retries stay on cheap models`)
      }
      try {
        const result = await extractFromPDF(chunks[i], /* skipRpmRetry */ false, /* allowExpensiveModel */ allowExpensive, deadline)
        // Even an empty result on retry is "successful" — page may truly have nothing
        successes.push(result)
        if (result.transactions.length > 0) {
          console.log(`[gemini] chunk ${i + 1} recovered ${result.transactions.length} transactions on retry`)
        } else {
          console.log(`[gemini] chunk ${i + 1} still empty on retry — accepting as truly empty page`)
        }
      } catch (err: any) {
        const msg = String(err?.message || err).slice(0, 120)
        stillFailed.push(`chunk ${i + 1}: ${msg}`)
        console.error(`[gemini] chunk ${i + 1} failed on retry too: ${msg}`)
      }
    }
    console.log(`[gemini] sequential retry pass: ${Date.now() - tRetry}ms`)

    // Anything neither confirmed successful nor confirmed failed was cut off
    // by the deadline before it was even attempted.
    const unresolvedCount = chunks.length - successes.length - stillFailed.length
    const missingChunks = stillFailed.length + unresolvedCount
    if (missingChunks > 0 && successes.length === 0) {
      throw new Error(`All chunks failed: ${stillFailed.join('; ') || 'extraction deadline reached before any chunk completed'}`)
    }
    if (missingChunks > 0) {
      const missingPages = missingChunks * pagesPerChunk
      console.warn(`[gemini] ${missingChunks}/${chunks.length} chunks (~${missingPages} pages) missing from final result.`)
      const merged = mergeAndClean(successes)
      merged.warning = `AI service congestion meant roughly ${missingPages} page(s) out of ${chunks.length * pagesPerChunk} could not be confirmed in time. The transactions below are real, but this statement may be incomplete — re-upload to retry if the numbers look short.`
      return merged
    }
  }

  console.log(`[gemini] final: ${successes.length}/${chunks.length} chunks succeeded`)
  return mergeAndClean(successes)
}

// ─── Main export ──────────────────────────────────────────────────────────────
// skipRpmRetry: when true (chunked extraction), don't wait on RPM errors —
// cascade to the next model immediately, since we're parallel and waiting
// would just blow the AbortSignal timeout.
// allowExpensiveModel: gates MODEL_LEGACY (gemini-2.5-pro) out of the
// cascade. Pro costs far more per token than the two Flash models — during
// a real Gemini capacity crunch, every chunk in the parallel pass hitting
// 503 on both Flash models would otherwise cascade to Pro *simultaneously*.
// extractFromPDFChunked passes `false` here for the parallel pass (cheap
// models only) and only allows Pro for chunks that reach the sequential
// retry pass — bounding Pro usage to genuinely-stuck chunks retried one at
// a time, never a stampede of parallel requests.
// deadline (optional, Date.now()-style): hard ceiling for this extraction.
// Every fetch is clamped to the time remaining, and the cascade stops trying
// further models once the budget is essentially gone. Previously the
// single-call path had NO deadline at all: three models × 50s timeouts ×
// retry backoffs could run past 100s against the route's 55s race, so a
// slow small PDF was guaranteed to "fail" even when extraction would have
// succeeded — and the abandoned calls kept billing in the background.
export async function extractFromPDF(pdfBuffer: Buffer, skipRpmRetry: boolean = false, allowExpensiveModel: boolean = true, deadline?: number): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/app/apikey')

  const useInline = pdfBuffer.length <= INLINE_THRESHOLD
  const baseTimeout = skipRpmRetry ? CHUNK_CALL_TIMEOUT_MS : SINGLE_CALL_TIMEOUT_MS
  const call = (model: string, timeoutMs: number) => useInline
    ? callGeminiInline(pdfBuffer, apiKey, model, timeoutMs)
    : callGeminiFile(pdfBuffer, apiKey, model, timeoutMs)

  const models = allowExpensiveModel ? [MODEL_FAST, MODEL_ACCURATE, MODEL_LEGACY] : [MODEL_FAST, MODEL_ACCURATE]

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    const isLast = i === models.length - 1

    const remaining = deadline ? deadline - Date.now() : Infinity
    if (remaining < 3000) {
      throw new Error('AI extraction ran out of time. Please try again — repeat attempts are usually faster.')
    }
    const timeoutMs = Math.min(baseTimeout, remaining)

    // Skip a model that a sibling chunk (or an earlier request on this warm
    // instance) already found overloaded seconds ago — unless it's the last
    // model, in which case we always have to try something.
    if (!isLast && isModelCoolingDown(model)) {
      console.warn(`[gemini] ${model} on cooldown (recently overloaded) — skipping straight to ${models[i + 1]}`)
      continue
    }

    try {
      // For single-PDF calls: retry RPM with a short backoff (1 retry) —
      // but only if there's enough budget left that a backoff + second
      // attempt can actually complete.
      // For chunked calls: no retry — cascade to next model immediately.
      const retries = skipRpmRetry || remaining < 15000 ? 0 : 1
      const result = await withRetry(() => call(model, timeoutMs), retries, /* delayMs= */ 3000)

      if (result.transactions.length > 0) {
        // Try to fix missing bank name via IFSC
        if (!result.meta.bank_name && result.meta.ifsc) {
          result.meta.bank_name = bankFromIfsc(result.meta.ifsc)
        }
        return result
      }

      console.warn(`[gemini] ${model} returned 0 transactions — trying next model`)

    } catch (err: any) {
      const msg = String(err?.message || '')
      const isDaily = isDailyLimitError(msg)
      const isRateLimit = /rate_limit|rate.?limit|quota|resource.?exhausted/i.test(msg)

      if (isRateLimit) {
        if (!isDaily) markModelOverloaded(model)
        if (isLast) {
          // All models exhausted
          throw new Error(
            isDaily
              ? 'Daily AI limit reached. Please try again after midnight, or contact support if urgent.'
              : 'AI service is temporarily at capacity. Please wait 1–2 minutes and try again.'
          )
        }
        console.warn(`[gemini] ${model} ${isDaily ? 'daily limit' : 'rate limit'} — switching to ${models[i + 1]}`)
        continue // try next model
      }

      // Non-rate-limit error — propagate immediately, no point trying other models
      throw err
    }
  }

  // All models tried, all returned 0 transactions
  throw new Error(
    'No transactions found in this PDF. Make sure it is a real bank statement (not an account summary or scanned image with poor quality).'
  )
}

// ─── IFSC prefix → bank name lookup ──────────────────────────────────────────
function bankFromIfsc(ifsc: string): string | null {
  const prefix = (ifsc || '').toUpperCase().slice(0, 4)
  const map: Record<string, string> = {
    SBIN: 'State Bank of India', HDFC: 'HDFC Bank', ICIC: 'ICICI Bank',
    UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank', PUNB: 'Punjab National Bank',
    BARB: 'Bank of Baroda', CNRB: 'Canara Bank', UBIN: 'Union Bank of India',
    BKID: 'Bank of India', CBIN: 'Central Bank of India', IDIB: 'Indian Bank',
    IDFB: 'IDFC First Bank', INDB: 'IndusInd Bank', YESB: 'Yes Bank',
    FDRL: 'Federal Bank', KARB: 'Karnataka Bank', SIBL: 'South Indian Bank',
    RATN: 'RBL Bank', DCBL: 'DCB Bank', BDBL: 'Bandhan Bank',
    AUBL: 'AU Small Finance Bank', UJVN: 'Ujjivan Small Finance Bank',
    IBKL: 'IDBI Bank', MAHB: 'Bank of Maharashtra', UCBA: 'UCO Bank',
    PSIB: 'Punjab & Sind Bank', IOBA: 'Indian Overseas Bank',
  }
  return map[prefix] ?? null
}

// ─── Response parser ──────────────────────────────────────────────────────────
function parseResponse(data: any, model: string): ExtractionResult {
  const candidate = data.candidates?.[0]
  const finishReason = candidate?.finishReason

  // Warn if output was cut off — likely maxOutputTokens hit
  if (finishReason === 'MAX_TOKENS') {
    console.warn(`[gemini] ${model} hit MAX_TOKENS — output may be truncated. Consider splitting large PDFs.`)
  }

  const text  = candidate?.content?.parts?.[0]?.text?.trim() ?? ''
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const tryParse = (s: string): ExtractionResult | null => {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        return { meta: { ...EMPTY_META }, transactions: parsed }
      }
      if (parsed && typeof parsed === 'object') {
        return {
          meta: { ...EMPTY_META, ...(parsed.meta ?? {}) },
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        }
      }
    } catch {}
    return null
  }

  const direct = tryParse(clean)
  if (direct) return direct

  // Try to extract a JSON object or array from surrounding text
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) { const r = tryParse(objMatch[0]); if (r) return r }

  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) { const r = tryParse(arrMatch[0]); if (r) return r }

  // If JSON was truncated, try to salvage partial transactions
  const partialMatch = clean.match(/(\[[\s\S]*)$/)
  if (partialMatch) {
    try {
      // Close any incomplete JSON array
      const partial = partialMatch[1]
        .replace(/,\s*$/, '')   // remove trailing comma
        .replace(/\{[^}]*$/, '') // remove incomplete last object
        + ']'
      const r = tryParse(`{"meta":{},"transactions":${partial}}`)
      if (r && r.transactions.length > 0) {
        console.warn(`[gemini] Salvaged ${r.transactions.length} transactions from truncated output`)
        return r
      }
    } catch {}
  }

  console.warn('[gemini] Could not parse response, returning empty result. Raw:', clean.slice(0, 300))
  return { meta: { ...EMPTY_META }, transactions: [] }
}

// ─── Merge + deduplicate results from multiple calls ─────────────────────────
// Defensive pipeline:
//   1. Normalize each result (parses dates/amounts, drops junk rows, fixes
//      both-debit-and-credit-set mistakes — see lib/normalize.ts).
//   2. Merge metas, preferring the first non-null value for each field.
//   3. Dedup transactions using ref_no when present (highest signal) or
//      a normalized composite key otherwise.
//   4. Sort chronologically.
export function mergeAndClean(allResults: ExtractionResult[]): ExtractionResult {
  // Normalize first — this strips junk, parses amounts/dates, and drops
  // duplicate "BROUGHT FORWARD"/"OPENING BALANCE" header rows.
  const { normalizeExtraction } = require('./normalize') as typeof import('./normalize')
  const normalized = allResults.map(normalizeExtraction)

  // Merge metas (first non-null wins)
  const meta: StatementMeta = { ...EMPTY_META }
  for (const r of normalized) {
    for (const k of Object.keys(meta) as (keyof StatementMeta)[]) {
      if ((meta as any)[k] == null && r.meta?.[k] != null) (meta as any)[k] = r.meta[k]
    }
  }

  // Dedup. Strategy:
  //   - If both rows have the same ref_no AND same date → duplicate.
  //   - Otherwise, key on date|debit|credit|first-40-chars-of-description.
  //     We use the larger description prefix (40 vs old 30) because chunk
  //     splits sometimes truncate descriptions slightly differently.
  const seenRef = new Set<string>()
  const seenKey = new Set<string>()
  const transactions = normalized
    .flatMap(r => r.transactions)
    .filter(tx => {
      if (!tx?.date) return false

      // ref_no-based dedup (UPI ref, UTR, cheque number — globally unique)
      if (tx.ref_no && tx.ref_no.length >= 6) {
        const refKey = `${tx.date}|${tx.ref_no}`
        if (seenRef.has(refKey)) return false
        seenRef.add(refKey)
      }

      // Composite key dedup (catches rows without ref_no)
      const descStem = (tx.description || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 40)
      const key = `${tx.date}|${tx.debit ?? '_'}|${tx.credit ?? '_'}|${descStem}`
      if (seenKey.has(key)) return false
      seenKey.add(key)
      return true
    })
    .sort((a, b) => {
      // Primary sort: date; secondary: keep original order within same date
      const t = new Date(a.date).getTime() - new Date(b.date).getTime()
      return t
    })

  // Last-resort bank name from IFSC
  if (!meta.bank_name && meta.ifsc) {
    meta.bank_name = bankFromIfsc(meta.ifsc)
  }

  return { meta, transactions }
}

// ─── Transaction type detector ────────────────────────────────────────────────
export function detectTransactionType(desc: string): string {
  const d = (desc || '').toUpperCase()
  if (d.includes('UPI'))                                       return 'UPI'
  if (d.includes('NEFT'))                                      return 'NEFT'
  if (d.includes('IMPS'))                                      return 'IMPS'
  if (d.includes('RTGS'))                                      return 'RTGS'
  if (d.includes('ATM') || d.includes('CASH WDL') || d.includes('WITHDRAWAL')) return 'ATM/Cash'
  if (d.includes('NACH') || d.includes('ECS'))                 return 'NACH/ECS'
  if (d.includes('CHEQUE') || d.includes('CHQ') || d.includes('CHK')) return 'Cheque'
  if (d.includes('INTEREST') || d.includes('INT.') || d.includes('INT ')) return 'Interest'
  if (d.includes('CHARGES') || d.includes('FEE') || d.includes('GST')) return 'Charges'
  if (d.includes('SALARY') || d.includes('SAL/'))              return 'Salary'
  if (d.includes('REFUND'))                                    return 'Refund'
  if (d.includes('POS ') || d.includes('CARD'))                return 'Card'
  return 'Other'
}
