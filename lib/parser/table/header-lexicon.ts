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
 * Splits header cells that contain MORE THAN ONE lexicon field into
 * per-field cells, x-ranges estimated by character position.
 *
 * Real statements produce these when two column headers sit closer than the
 * cell-coalescing gap (or are emitted as one text run by browser-print
 * PDFs): "Debit (Rs) Credit (Rs)" and "Chq/Ref No Withdrawal" were both
 * observed as single cells — each swallowing a money column, which loses
 * every amount downstream. Cells with 0 or 1 field matches pass through
 * untouched.
 */
export function expandCompoundHeaderCells(cells: ReadonlyArray<Cell>): Cell[] {
  const out: Cell[] = []
  for (const cell of cells) {
    const matches = findFieldMatches(cell.text)
    if (matches.length < 2) {
      out.push(cell)
      continue
    }
    const width = cell.xEnd - cell.x
    const len = cell.text.length
    for (let i = 0; i < matches.length; i++) {
      // Each sub-cell runs from its match's start to just before the next
      // match's start (the last one takes the remainder).
      const startChar = i === 0 ? 0 : matches[i].start
      const endChar = i === matches.length - 1 ? len : matches[i + 1].start
      out.push({
        text: cell.text.slice(startChar, endChar).trim(),
        x: cell.x + (startChar / len) * width,
        xEnd: cell.x + (endChar / len) * width,
      })
    }
  }
  return out
}

/** A lexicon field found inside a text, with character offsets. */
interface FieldMatch {
  field: CanonicalField
  start: number
  end: number
}

/**
 * Finds ALL distinct lexicon fields inside one text, with char offsets, by
 * sliding a word-window over the tokenized text (longest phrases first so
 * "value date" isn't consumed as "date").
 */
function findFieldMatches(text: string): FieldMatch[] {
  const tokens: { norm: string; start: number; end: number }[] = []
  const re = /[a-zA-Z0-9]+/g
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    tokens.push({ norm: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length })
  }
  const consumed = new Array(tokens.length).fill(false)
  const matches: FieldMatch[] = []
  const entries = [...LEXICON].sort((a, b) => b.phrase.length - a.phrase.length)
  for (const entry of entries) {
    const words = entry.phrase.split(' ')
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (consumed[i]) continue
      let ok = true
      for (let j = 0; j < words.length; j++) {
        if (consumed[i + j] || tokens[i + j].norm !== words[j]) {
          ok = false
          break
        }
      }
      if (!ok) continue
      if (matches.some(x => x.field === entry.field)) continue // one per field
      for (let j = 0; j < words.length; j++) consumed[i + j] = true
      matches.push({ field: entry.field, start: tokens[i].start, end: tokens[i + words.length - 1].end })
    }
  }
  return matches.sort((a, b) => a.start - b.start)
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
