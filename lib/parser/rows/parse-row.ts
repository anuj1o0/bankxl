/**
 * lib/parser/rows/parse-row.ts — row parsing stage.
 *
 * The semantic step: mapped raw rows → canonical ParsedTransactions.
 * Reuses parseAmount from lib/normalize.ts (the battle-tested rupee parser
 * handling Indian grouping, currency markers, and Dr/Cr tokens) per the
 * reuse-over-rewrite rule.
 *
 * Realities handled here:
 *  - junk rows printed inside the table body (B/F, opening/closing balance,
 *    totals) are dropped, counted, and logged — never emitted;
 *  - banks that print a date only on the first of several same-day rows:
 *    dateless rows with amounts INHERIT the previous row's date (flagged,
 *    confidence-reduced);
 *  - balances suffixed "Dr" are overdrafts → negative;
 *  - single-Amount formats split into debit/credit via the Dr/Cr column.
 */
import { parseAmount } from '@/lib/normalize'
import { ParserError } from '../core/errors'
import type { ParseContext, ParsedTransaction, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { BankRules } from '../banks/types'
import type { ColumnMapping, HeaderMappingOutput } from '../map/header-map'
import { parseStatementDate, inferDateFormat } from './parse-date'
import type { DateFieldOrder } from '../core/types'

export interface RowParsingInput {
  mapped: HeaderMappingOutput
  bank: BankRules | null
}

export interface RowParsingOutput {
  transactions: ParsedTransaction[]
  junkRowsDropped: number
}

/** Rows whose joined text matches any of these are table furniture. */
const GENERIC_JUNK_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(?:b\/f|c\/f|brought\s+forward|carried\s+forward)\b/i,
  /^opening\s+balance\b/i,
  /^closing\s+balance\b/i,
  /^total\b/i,
  /^grand\s+total\b/i,
  // Statement-body totals rows, as printed by real banks (observed:
  // "TRANSACTION TOTAL" extracted as a transaction, doubling the export's
  // own totals). Structure guard still protects merchants like
  // "TOTAL FUEL STATION" — those rows carry a date.
  /\btransactions?\s+totals?\b/i,
  /^totals?\s+(?:transactions?|debits?|credits?|amount)\b/i,
]

/**
 * Negative-balance notations banks actually print: trailing "Dr"
 * (debit balance), trailing "OD" (overdrawn), or accounting parentheses —
 * "(22,736.59) OD" was observed in the wild combining both.
 */
const NEG_SUFFIX_RE = /\b(?:dr|od)\b\.?\s*$/i
const CR_MARKER_RE = /^cr/i

function hasNegativeMarker(raw: string): boolean {
  const t = raw.trim()
  if (NEG_SUFFIX_RE.test(t)) return true
  return /^\(.*\)$/.test(t.replace(NEG_SUFFIX_RE, '').trim())
}

/**
 * Whether the row's text matches a junk pattern. Patterns run against each
 * individual cell AND the joined text: anchored patterns (^opening balance)
 * must be able to hit the description cell of a row whose joined text
 * starts with a date. This is only the TEXT signal — the caller combines it
 * with structure (a pattern-matching row that still has a date and a
 * debit/credit is a real transaction, e.g. "TOTAL FUEL STATION").
 */
function matchesJunkPattern(cells: ReadonlyArray<string>, bank: BankRules | null): boolean {
  const candidates = [...cells.filter(c => c.length > 0).map(c => c.trim()), cells.filter(c => c.length > 0).join(' ').trim()]
  const patterns = [...GENERIC_JUNK_PATTERNS, ...(bank?.junkRowPatterns ?? [])]
  return candidates.some(text => patterns.some(re => re.test(text)))
}

function cellAt(cells: ReadonlyArray<string>, index: number | undefined): string {
  return index === undefined ? '' : (cells[index] ?? '')
}

/** Balance parse honoring overdraft notation: "1,234.56 Dr", "(1,234.56) OD". */
function parseBalance(raw: string): number | null {
  const value = parseAmount(raw)
  if (value === null) return null
  return hasNegativeMarker(raw) ? -Math.abs(value) : value
}

/** Splits debit/credit from either two-column or Amount+Dr/Cr layouts. */
function parseMoney(
  cells: ReadonlyArray<string>,
  mapping: ColumnMapping
): { debit: number | null; credit: number | null } {
  if (mapping.amount !== undefined && mapping.drcr !== undefined) {
    const amount = parseAmount(cellAt(cells, mapping.amount))
    if (amount === null) return { debit: null, credit: null }
    const marker = cellAt(cells, mapping.drcr).trim()
    return CR_MARKER_RE.test(marker) ? { debit: null, credit: amount } : { debit: amount, credit: null }
  }
  return {
    debit: parseAmount(cellAt(cells, mapping.debit)),
    credit: parseAmount(cellAt(cells, mapping.credit)),
  }
}

/** Row parsing stage: MappedTable[] → canonical transactions. */
export class RowParsingStage implements PipelineStage<RowParsingInput, RowParsingOutput> {
  readonly name = 'row-parsing' as const

  async execute(
    input: RowParsingInput,
    ctx: ParseContext
  ): Promise<Omit<StageResult<RowParsingOutput>, 'durationMs' | 'stage'>> {
    const warnings: StageWarning[] = []
    const transactions: ParsedTransaction[] = []
    let junkRowsDropped = 0
    let unparseableRows = 0
    let inheritedDates = 0
    let lastDate: string | null = null

    // Infer DD/MM vs MM/DD from all date cells across all tables.
    const dateOrder: DateFieldOrder = ctx.dateFormat ?? (() => {
      const dateCells: string[] = []
      for (const { table, mapping } of input.mapped.tables) {
        for (const row of table.rows) {
          const d = cellAt(row.cells, mapping.date)
          if (d.trim()) dateCells.push(d)
        }
      }
      const inferred = inferDateFormat(dateCells)
      ctx.dateFormat = inferred
      return inferred
    })()

    for (const { table, mapping } of input.mapped.tables) {
      for (const row of table.rows) {
        const { debit, credit } = parseMoney(row.cells, mapping)
        const rawDate = parseStatementDate(cellAt(row.cells, mapping.date), dateOrder)

        // Junk = junk-shaped text WITHOUT full transaction structure. An
        // "OPENING BALANCE" row has a date+balance but no debit/credit; a
        // "TOTAL" row has sums but no date; a REAL transaction that merely
        // mentions a junk word ("TOTAL FUEL STATION") has both and is kept.
        const isRealTransaction = rawDate !== null && (debit !== null || credit !== null)
        if (!isRealTransaction && matchesJunkPattern(row.cells, input.bank)) {
          junkRowsDropped++
          continue
        }
        if (row.cells.every(c => c.trim().length === 0)) {
          junkRowsDropped++
          continue
        }

        if (debit === null && credit === null) {
          unparseableRows++
          warnings.push({
            code: 'ROW_WITHOUT_AMOUNT',
            message: `page ${row.page}: row dropped — no parseable amount ("${row.cells.join(' | ').slice(0, 80)}")`,
            page: row.page,
          })
          continue
        }

        let confidence = 1
        let date = rawDate
        if (date === null) {
          if (lastDate === null) {
            unparseableRows++
            warnings.push({
              code: 'ROW_WITHOUT_DATE',
              message: `page ${row.page}: row dropped — no date and none to inherit`,
              page: row.page,
            })
            continue
          }
          date = lastDate
          inheritedDates++
          confidence -= 0.3
        }
        lastDate = date

        const balance = parseBalance(cellAt(row.cells, mapping.balance))
        if (balance === null && mapping.balance !== undefined) confidence -= 0.15

        const description = cellAt(row.cells, mapping.description).replace(/\s+/g, ' ').trim()
        const reference = cellAt(row.cells, mapping.reference).trim() || null

        transactions.push({
          date,
          description,
          reference,
          debit,
          credit,
          balance,
          page: row.page,
          confidence: Math.max(0, confidence),
        })
      }
    }

    if (transactions.length === 0) {
      throw new ParserError('NO_TABLE_FOUND', 'Tables were detected but no row parsed into a transaction', 'row-parsing', {
        junkRowsDropped,
        unparseableRows,
      })
    }
    if (inheritedDates > 0) {
      warnings.push({
        code: 'DATES_INHERITED',
        message: `${inheritedDates} row(s) had no printed date and inherited the previous row's`,
      })
    }

    const attempted = transactions.length + unparseableRows
    ctx.log.info('rows_parsed', {
      transactions: transactions.length,
      junkRowsDropped,
      unparseableRows,
      inheritedDates,
    })

    return {
      data: { transactions, junkRowsDropped },
      confidence: attempted === 0 ? 0 : transactions.length / attempted,
      warnings,
    }
  }
}
