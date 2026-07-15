/**
 * lib/parser/table/header-lexicon.ts — vocabulary of transaction-table
 * header cells across Indian bank statements, and header-line scoring.
 *
 * The lexicon SUGGESTS canonical fields; the header-mapping stage (and
 * per-bank rule modules) make the final call. Adding a bank's odd header
 * spelling here is a data change, not a logic change.
 */
import type { CanonicalField, Cell } from './types'

/**
 * Keyword → field table. Matching is on normalized text (lowercased,
 * punctuation stripped, whitespace collapsed). Order matters only within
 * this file's logic: longer, more specific phrases are checked before
 * shorter generic ones so "value date" wins over "date".
 */
const LEXICON: ReadonlyArray<{ phrase: string; field: CanonicalField }> = [
  // Specific multi-word phrases first
  { phrase: 'value date', field: 'valueDate' },
  { phrase: 'value dt', field: 'valueDate' },
  { phrase: 'transaction date', field: 'date' },
  { phrase: 'txn date', field: 'date' },
  { phrase: 'tran date', field: 'date' },
  { phrase: 'post date', field: 'date' },
  { phrase: 'posting date', field: 'date' },
  { phrase: 'transaction details', field: 'description' },
  { phrase: 'transaction remarks', field: 'description' },
  { phrase: 'withdrawal amt', field: 'debit' },
  { phrase: 'withdrawal amount', field: 'debit' },
  { phrase: 'debit amount', field: 'debit' },
  { phrase: 'debit amt', field: 'debit' },
  { phrase: 'deposit amt', field: 'credit' },
  { phrase: 'deposit amount', field: 'credit' },
  { phrase: 'credit amount', field: 'credit' },
  { phrase: 'credit amt', field: 'credit' },
  { phrase: 'closing balance', field: 'balance' },
  { phrase: 'running balance', field: 'balance' },
  { phrase: 'available balance', field: 'balance' },
  { phrase: 'balance amt', field: 'balance' },
  { phrase: 'chq ref no', field: 'reference' },
  { phrase: 'chq ref number', field: 'reference' },
  { phrase: 'cheque no', field: 'reference' },
  { phrase: 'chq no', field: 'reference' },
  { phrase: 'ref no', field: 'reference' },
  { phrase: 'reference no', field: 'reference' },
  { phrase: 'instrument no', field: 'reference' },
  { phrase: 'instrument id', field: 'reference' },
  { phrase: 'utr no', field: 'reference' },
  { phrase: 'dr cr', field: 'drcr' },
  // Single words last
  { phrase: 'date', field: 'date' },
  { phrase: 'particulars', field: 'description' },
  { phrase: 'narration', field: 'description' },
  { phrase: 'description', field: 'description' },
  { phrase: 'details', field: 'description' },
  { phrase: 'remarks', field: 'description' },
  { phrase: 'withdrawal', field: 'debit' },
  { phrase: 'withdrawals', field: 'debit' },
  { phrase: 'debit', field: 'debit' },
  { phrase: 'debits', field: 'debit' },
  { phrase: 'deposit', field: 'credit' },
  { phrase: 'deposits', field: 'credit' },
  { phrase: 'credit', field: 'credit' },
  { phrase: 'credits', field: 'credit' },
  { phrase: 'balance', field: 'balance' },
  { phrase: 'amount', field: 'amount' },
  { phrase: 'reference', field: 'reference' },
  { phrase: 'utr', field: 'reference' },
]

/** Lowercase, strip punctuation to spaces, collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Maps one header cell's text to its most likely canonical field.
 *
 * @param text - Header cell text as printed (e.g. "Chq./Ref.No.").
 * @returns The suggested field, or null when nothing in the lexicon matches.
 */
export function matchHeaderCell(text: string): CanonicalField | null {
  const norm = normalize(text)
  if (norm.length === 0) return null
  for (const entry of LEXICON) {
    if (norm === entry.phrase) return entry.field
  }
  // Substring pass for decorated headers like "Withdrawal Amt (INR)".
  for (const entry of LEXICON) {
    if (norm.includes(entry.phrase)) return entry.field
  }
  return null
}

/** Result of scoring one line as a potential transaction-table header. */
export interface HeaderScore {
  /** Distinct canonical fields matched across the line's cells. */
  matchedFields: CanonicalField[]
  /** Field suggestion per cell (parallel to the input cells). */
  cellFields: (CanonicalField | null)[]
  /** True when the line qualifies as a transaction-table header. */
  isHeader: boolean
}

/**
 * Scores a line's cells as a potential header row.
 *
 * Qualifies when ≥3 DISTINCT canonical fields match, including 'date' and at
 * least one money column (debit/credit/amount/balance) — that combination
 * doesn't occur in prose, addresses, or summary boxes.
 *
 * @param cells - The line's coalesced cells (see lines.ts).
 */
export function scoreHeaderLine(cells: ReadonlyArray<Cell>): HeaderScore {
  const cellFields = cells.map(c => matchHeaderCell(c.text))
  const distinct = new Set<CanonicalField>()
  for (const f of cellFields) if (f) distinct.add(f)

  const hasDate = distinct.has('date')
  const hasMoney =
    distinct.has('debit') || distinct.has('credit') || distinct.has('amount') || distinct.has('balance')

  return {
    matchedFields: [...distinct],
    cellFields,
    isHeader: distinct.size >= 3 && hasDate && hasMoney,
  }
}
