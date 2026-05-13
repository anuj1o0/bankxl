/**
 * lib/gemini.ts — fast PDF extraction using Google Gemini 2.5 Flash
 * Free tier: 1,500 requests/day, 15 req/min
 * Get key: https://aistudio.google.com/app/apikey
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
}

// gemini-2.5-flash-lite is ~3x faster than gemini-2.5-flash for similar accuracy on
// structured extraction. We fall back to gemini-2.5-flash if lite returns 0 transactions.
const MODEL_FAST = 'gemini-2.5-flash-lite'
const MODEL_ACCURATE = 'gemini-2.5-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const INLINE_THRESHOLD = 7 * 1024 * 1024 // 7 MB — under this, use inline (faster)

const PROMPT = `Extract data from this bank statement PDF.
Return ONLY a single valid JSON object. No markdown, no code fences, no explanation.

Schema (every key must be present, use null when unknown):
{
  "meta": {
    "bank_name": "string|null",
    "account_holder": "string|null",
    "account_no": "string|null",
    "ifsc": "string|null",
    "period_from": "YYYY-MM-DD|null",
    "period_to": "YYYY-MM-DD|null",
    "opening_balance": "number|null",
    "closing_balance": "number|null",
    "currency": "INR|USD|EUR|GBP|AED|SGD|...",
    "total_pages": "number|null"
  },
  "transactions": [
    {"date":"YYYY-MM-DD","description":"string","debit":number|null,"credit":number|null,"balance":number|null,"ref_no":"string|null"}
  ]
}

Strict rules:
- Amounts: plain numbers, no commas, no currency symbols.
- Dates: always YYYY-MM-DD.
- For description, keep narration concise but include payee/UPI ID/cheque info.
- Debit (Dr/Withdrawal): put amount in "debit", credit must be null.
- Credit (Cr/Deposit): put amount in "credit", debit must be null.
- Ref/Cheque/UPI ref/UTR goes in "ref_no".
- Skip header rows, page totals, "Brought Forward", "Carried Forward", and OPENING/CLOSING balance rows (capture them in meta instead).
- Default currency to INR if Indian bank.
- Include EVERY transaction row across all pages.`

const EMPTY_META: StatementMeta = {
  bank_name: null,
  account_holder: null,
  account_no: null,
  ifsc: null,
  period_from: null,
  period_to: null,
  opening_balance: null,
  closing_balance: null,
  currency: 'INR',
  total_pages: null,
}

async function callGeminiInline(pdfBuffer: Buffer, apiKey: string, model: string): Promise<ExtractionResult> {
  const t0 = Date.now()
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 32768,
        responseMimeType: 'application/json',
      },
    }),
  })

  console.log(`[gemini] ${model} inline call: ${Date.now() - t0}ms (status=${res.status})`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    if (res.status === 429) throw new Error('AI service is busy. Wait a minute and try again.')
    if (res.status === 400) throw new Error(`This PDF couldn't be read: ${msg}`)
    throw new Error(`Extraction failed: ${msg}`)
  }
  return parseResponse(await res.json())
}

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
  if (!uploadUrl) throw new Error('Could not start file upload. Check your GEMINI_API_KEY.')

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
  const fileUri = fileData?.file?.uri
  if (!fileUri) throw new Error('No file URI returned from Gemini File API')
  return fileUri
}

async function callGeminiFile(pdfBuffer: Buffer, apiKey: string, model: string): Promise<ExtractionResult> {
  const tUpload = Date.now()
  const fileUri = await uploadToFileAPI(pdfBuffer, apiKey)
  console.log(`[gemini] file upload: ${Date.now() - tUpload}ms`)

  const t0 = Date.now()
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 32768,
        responseMimeType: 'application/json',
      },
    }),
  })

  console.log(`[gemini] ${model} file call: ${Date.now() - t0}ms (status=${res.status})`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `HTTP ${res.status}`
    if (res.status === 429) throw new Error('AI service is busy. Wait a minute and try again.')
    if (res.status === 400) throw new Error(`This PDF couldn't be read: ${msg}`)
    throw new Error(`Extraction failed: ${msg}`)
  }
  return parseResponse(await res.json())
}

export async function extractFromPDF(pdfBuffer: Buffer): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/app/apikey')
  }

  const useInline = pdfBuffer.length <= INLINE_THRESHOLD
  const call = useInline ? callGeminiInline : callGeminiFile

  // First try with the fast model
  try {
    const result = await call(pdfBuffer, apiKey, MODEL_FAST)
    if (result.transactions.length > 0) return result
    console.warn('[gemini] fast model returned 0 transactions, retrying with accurate model')
  } catch (err: any) {
    // Retry with the accurate model on extraction errors (not auth/rate-limit)
    const msg = String(err?.message || '')
    if (/busy|rate limit|quota/i.test(msg)) throw err
    console.warn('[gemini] fast model failed:', msg, '— retrying with accurate model')
  }

  // Fallback to the more accurate (but slower) model
  return call(pdfBuffer, apiKey, MODEL_ACCURATE)
}

function parseResponse(data: any): ExtractionResult {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
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

  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) {
    const parsed = tryParse(objMatch[0])
    if (parsed) return parsed
  }

  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    const parsed = tryParse(arrMatch[0])
    if (parsed) return parsed
  }

  return { meta: { ...EMPTY_META }, transactions: [] }
}

export function mergeAndClean(allResults: ExtractionResult[]): ExtractionResult {
  const seen = new Set<string>()
  const transactions = allResults.flatMap(r => r.transactions)
    .filter(tx => {
      if (!tx?.date) return false
      const key = `${tx.date}|${tx.debit ?? ''}|${tx.credit ?? ''}|${(tx.description || '').slice(0, 30)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.date && b.date ? new Date(a.date).getTime() - new Date(b.date).getTime() : 0))

  const meta: StatementMeta = { ...EMPTY_META }
  for (const r of allResults) {
    for (const k of Object.keys(meta) as (keyof StatementMeta)[]) {
      if ((meta as any)[k] == null && r.meta?.[k] != null) (meta as any)[k] = r.meta[k]
    }
  }
  return { meta, transactions }
}

export function detectTransactionType(desc: string): string {
  const d = (desc || '').toUpperCase()
  if (d.includes('UPI')) return 'UPI'
  if (d.includes('NEFT')) return 'NEFT'
  if (d.includes('IMPS')) return 'IMPS'
  if (d.includes('RTGS')) return 'RTGS'
  if (d.includes('ATM') || d.includes('CASH WDL') || d.includes('WITHDRAWAL')) return 'ATM/Cash'
  if (d.includes('NACH') || d.includes('ECS')) return 'NACH/ECS'
  if (d.includes('CHEQUE') || d.includes('CHQ') || d.includes('CHK')) return 'Cheque'
  if (d.includes('INTEREST') || d.includes('INT.') || d.includes('INT ')) return 'Interest'
  if (d.includes('CHARGES') || d.includes('FEE') || d.includes('GST')) return 'Charges'
  if (d.includes('SALARY') || d.includes('SAL/')) return 'Salary'
  if (d.includes('REFUND')) return 'Refund'
  if (d.includes('POS ') || d.includes('CARD')) return 'Card'
  return 'Other'
}
