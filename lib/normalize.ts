/**
 * lib/normalize.ts — defensive normalization for extracted bank-statement data.
 *
 * Gemini is good but not perfect. It occasionally returns:
 *   - amounts as strings with Indian commas ("1,23,456.78") or European format
 *   - dates as DD/MM/YYYY, MMM DD YYYY, etc. (despite being asked for YYYY-MM-DD)
 *   - rows with BOTH debit and credit set (a mistake)
 *   - junk rows like "BROUGHT FORWARD", "OPENING BALANCE", page totals
 *   - the same transaction extracted twice when it spans a chunk boundary
 *
 * This file deals with all of that so downstream code (Excel, CSV, Tally)
 * sees clean, consistent data.
 */

import type { Transaction, StatementMeta, ExtractionResult } from './gemini'

// ─── Amount parsing ──────────────────────────────────────────────────────────
// Accepts: 1234.56, "1234.56", "1,234.56", "1,23,456.78" (Indian),
//          "1.234,56" (European), "₹1,200", "$ 12.50", "12,400.50 Cr"
// Returns null for empty/garbage values.
export function parseAmount(v: any): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0 ? Math.abs(v) : null
  if (typeof v !== 'string') return null

  let s = v.trim()
  if (!s) return null

  // Strip currency symbols, "Dr"/"Cr" suffixes, parentheses (some banks wrap negatives)
  const isNegative = /^\(.*\)$/.test(s) || /[-−]\s*$/.test(s)
  s = s
    .replace(/[₹$€£¥]/g, '')
    .replace(/\b(dr|cr|debit|credit|inr|usd|eur|gbp)\b\.?/gi, '')
    .replace(/[()]/g, '')
    .replace(/[-−]/g, '')
    .trim()

  if (!s) return null

  // European format: 1.234,56 → comma is decimal, dot is thousands separator.
  // Heuristic: if there's a comma later than the last dot, it's European.
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot && lastDot !== -1) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    // Default (Indian, US, UK): strip commas — they're thousand separators.
    s = s.replace(/,/g, '')
  }

  // Strip any remaining non-numeric chars except dot and digits
  s = s.replace(/[^\d.]/g, '')
  if (!s || s === '.') return null

  const n = parseFloat(s)
  if (!Number.isFinite(n) || n === 0) return null
  return isNegative ? -n : n
}

// ─── Date parsing ─────────────────────────────────────────────────────────────
// Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YYYY, "15 Mar 2025", etc.
// Returns YYYY-MM-DD or null.
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

export function parseDate(v: any, contextYear?: number): string | null {
  if (v == null) return null
  if (typeof v !== 'string') return null

  const s = v.trim()
  if (!s) return null

  // Already in ISO format
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    return formatISO(+y, +m, +d)
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Indian standard)
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (dmy) {
    let [, d, m, y] = dmy
    let year = +y
    if (year < 100) year += year >= 70 ? 1900 : 2000
    return formatISO(year, +m, +d)
  }

  // DD-MMM-YYYY  (e.g. 15-Mar-2025, 15 March 25)
  const dmName = s.match(/^(\d{1,2})[\s\-\/\.]+([A-Za-z]+)[\s\-\/\.]+(\d{2,4})/)
  if (dmName) {
    let [, d, monStr, y] = dmName
    const m = MONTHS[monStr.toLowerCase()]
    if (m) {
      let year = +y
      if (year < 100) year += year >= 70 ? 1900 : 2000
      return formatISO(year, m, +d)
    }
  }

  // MMM DD, YYYY  (e.g. "Mar 15, 2025")
  const mdy = s.match(/^([A-Za-z]+)[\s\-\.]+(\d{1,2})[,\s]+(\d{2,4})/)
  if (mdy) {
    const [, monStr, d, y] = mdy
    const m = MONTHS[monStr.toLowerCase()]
    if (m) {
      let year = +y
      if (year < 100) year += year >= 70 ? 1900 : 2000
      return formatISO(year, m, +d)
    }
  }

  // DD-MMM (year missing — use contextYear from statement period)
  if (contextYear) {
    const dmNoYear = s.match(/^(\d{1,2})[\s\-\/\.]+([A-Za-z]+)$/)
    if (dmNoYear) {
      const [, d, monStr] = dmNoYear
      const m = MONTHS[monStr.toLowerCase()]
      if (m) return formatISO(contextYear, m, +d)
    }
  }

  // Last resort: JS Date constructor
  const t = Date.parse(s)
  if (!isNaN(t)) {
    const dt = new Date(t)
    return formatISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
  }

  return null
}

function formatISO(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ─── Junk-row detection ──────────────────────────────────────────────────────
// Catches header noise that leaks across chunk boundaries:
// "BROUGHT FORWARD", "B/F", "C/F", "CARRIED FORWARD", "OPENING BALANCE",
// "CLOSING BALANCE", "BALANCE B/D", "TOTAL", page numbers, etc.
const JUNK_PATTERNS = [
  /^b\/?f$/i, /^c\/?f$/i, /^b\/?d$/i,
  /\b(brought|carried)\s+forward\b/i,
  /\b(opening|closing)\s+balance\b/i,
  /^\s*total\s*$/i, /^\s*subtotal\s*$/i, /^\s*sub.?total\s*$/i,
  /^\s*page\s+\d+/i,
  /^\s*continued?\s*\.?\.?\.?\s*$/i,
  /^\s*statement\s+of\s+account/i,
  /^\s*account\s+summary/i,
  /^\s*end\s+of\s+statement/i,
]

function isJunkDescription(desc: string): boolean {
  const d = (desc || '').trim()
  if (!d) return false
  return JUNK_PATTERNS.some(p => p.test(d))
}

// ─── Normalize a single transaction ──────────────────────────────────────────
export function normalizeTransaction(tx: any, contextYear?: number): Transaction | null {
  if (!tx || typeof tx !== 'object') return null

  const date = parseDate(tx.date, contextYear)
  const description = typeof tx.description === 'string' ? tx.description.trim().replace(/\s+/g, ' ') : ''
  const ref_no = tx.ref_no != null ? String(tx.ref_no).trim() : null

  let debit = parseAmount(tx.debit)
  let credit = parseAmount(tx.credit)
  const balance = parseAmount(tx.balance)

  // Drop rows missing both date AND amount — they're not transactions
  if (!date && debit == null && credit == null) return null
  if (!date) return null  // date is required

  // Drop junk header/footer rows
  if (isJunkDescription(description)) return null

  // Drop rows with no amount AND no description (truly empty)
  if (debit == null && credit == null && !description) return null

  // "Both debit and credit set" — Gemini mistake. Pick the larger of the two,
  // assume the smaller was a misread of the running balance digits.
  if (debit != null && credit != null) {
    if (debit > credit) credit = null
    else debit = null
  }

  return {
    date,
    description: description || '(no description)',
    debit,
    credit,
    balance,
    ref_no: ref_no || null,
  }
}

// ─── Normalize an entire extraction result ───────────────────────────────────
export function normalizeExtraction(r: ExtractionResult): ExtractionResult {
  const meta = normalizeMeta(r.meta)
  const contextYear = meta.period_from ? +meta.period_from.slice(0, 4)
                    : meta.period_to ? +meta.period_to.slice(0, 4)
                    : undefined

  const transactions = (r.transactions || [])
    .map(tx => normalizeTransaction(tx, contextYear))
    .filter((tx): tx is Transaction => tx !== null)

  return { meta, transactions }
}

function normalizeMeta(m: any): StatementMeta {
  const empty: StatementMeta = {
    bank_name: null, account_holder: null, account_no: null, ifsc: null,
    period_from: null, period_to: null, opening_balance: null, closing_balance: null,
    currency: 'INR', total_pages: null,
  }
  if (!m || typeof m !== 'object') return empty

  return {
    bank_name: cleanString(m.bank_name),
    account_holder: cleanString(m.account_holder),
    account_no: cleanString(m.account_no),
    ifsc: cleanString(m.ifsc)?.toUpperCase() || null,
    period_from: parseDate(m.period_from),
    period_to: parseDate(m.period_to),
    opening_balance: parseAmount(m.opening_balance),
    closing_balance: parseAmount(m.closing_balance),
    currency: typeof m.currency === 'string' && m.currency.length <= 4 ? m.currency.toUpperCase() : 'INR',
    total_pages: typeof m.total_pages === 'number' ? m.total_pages : null,
  }
}

function cleanString(v: any): string | null {
  if (v == null) return null
  const s = String(v).trim().replace(/\s+/g, ' ')
  if (!s) return null
  // Gemini sometimes returns literal "null", "unknown", "n/a"
  if (/^(null|unknown|n\/?a|none|-+)$/i.test(s)) return null
  return s
}

// ─── Best-effort bank name from filename ─────────────────────────────────────
// Used as the final fallback if both Gemini and IFSC lookup fail.
export function bankNameFromFilename(filename: string): string | null {
  const f = filename.toLowerCase()
  const map: Array<[RegExp, string]> = [
    [/\bsbi\b|state.?bank/i, 'State Bank of India'],
    [/\bhdfc\b/i, 'HDFC Bank'],
    [/\bicici\b/i, 'ICICI Bank'],
    [/\baxis\b/i, 'Axis Bank'],
    [/\bkotak\b/i, 'Kotak Mahindra Bank'],
    [/\bpnb\b|punjab.?national/i, 'Punjab National Bank'],
    [/\bbob\b|bank.?of.?baroda/i, 'Bank of Baroda'],
    [/\bcanara\b/i, 'Canara Bank'],
    [/\bunion.?bank/i, 'Union Bank of India'],
    [/\bidfc\b/i, 'IDFC First Bank'],
    [/\bindusind\b/i, 'IndusInd Bank'],
    [/\byes.?bank/i, 'Yes Bank'],
    [/\bfederal\b/i, 'Federal Bank'],
    [/\brbl\b/i, 'RBL Bank'],
    [/\bidbi\b/i, 'IDBI Bank'],
    [/\bau.?sfb\b|au.?small/i, 'AU Small Finance Bank'],
    [/\bchase\b/i, 'Chase'],
    [/\bbank.?of.?america|\bboa\b/i, 'Bank of America'],
    [/\bwells.?fargo\b/i, 'Wells Fargo'],
    [/\bciti\b/i, 'Citibank'],
    [/\bhsbc\b/i, 'HSBC'],
    [/\bcapital.?one\b/i, 'Capital One'],
  ]
  for (const [re, name] of map) if (re.test(f)) return name
  return null
}
