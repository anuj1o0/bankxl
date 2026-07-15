/**
 * lib/parser/validate/checks.ts — structural validation checks.
 *
 * Pure functions over canonical transactions; each returns issues, never
 * throws, and knows nothing about verdicts (validate.ts owns policy).
 */
import { isUsableAmount } from '../core/money'
import type { ParsedTransaction, StatementMetadata } from '../core/types'
import type { ValidationIssue } from './types'

/** Days a transaction may fall outside the statement period before warning. */
const PERIOD_GRACE_DAYS = 5

/** Amounts above this (rupees) are suspicious in retail statements. */
const IMPLAUSIBLE_AMOUNT = 1_000_000_000 // 100 crore

/** Strict ISO calendar-date check (YYYY-MM-DD and actually a real date). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Exactly one of debit/credit must be set, and set amounts must be sane. */
export function checkAmounts(transactions: ReadonlyArray<ParsedTransaction>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  transactions.forEach((tx, i) => {
    const hasDebit = isUsableAmount(tx.debit)
    const hasCredit = isUsableAmount(tx.credit)
    if (hasDebit && hasCredit) {
      issues.push({
        code: 'BOTH_DEBIT_AND_CREDIT',
        severity: 'error',
        message: `row ${i}: both debit (${tx.debit}) and credit (${tx.credit}) set`,
        txIndex: i,
      })
    } else if (!hasDebit && !hasCredit) {
      issues.push({
        code: 'NO_AMOUNT',
        severity: 'error',
        message: `row ${i}: neither debit nor credit set`,
        txIndex: i,
      })
    }
    for (const [label, value] of [
      ['debit', tx.debit],
      ['credit', tx.credit],
    ] as const) {
      if (value === null) continue
      if (!Number.isFinite(value) || value < 0) {
        issues.push({
          code: 'INVALID_AMOUNT',
          severity: 'error',
          message: `row ${i}: ${label} is ${value}`,
          txIndex: i,
        })
      } else if (value === 0) {
        issues.push({
          code: 'ZERO_AMOUNT',
          severity: 'warning',
          message: `row ${i}: ${label} is zero`,
          txIndex: i,
        })
      } else if (value > IMPLAUSIBLE_AMOUNT) {
        issues.push({
          code: 'IMPLAUSIBLE_AMOUNT',
          severity: 'warning',
          message: `row ${i}: ${label} of ${value} exceeds plausibility bound`,
          txIndex: i,
        })
      }
    }
  })
  return issues
}

/** Dates must be real ISO dates, near the statement period when known. */
export function checkDates(
  transactions: ReadonlyArray<ParsedTransaction>,
  meta: Pick<StatementMetadata, 'periodFrom' | 'periodTo'>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const graceMs = PERIOD_GRACE_DAYS * 24 * 60 * 60 * 1000
  const from =
    meta.periodFrom && isValidIsoDate(meta.periodFrom) ? Date.parse(meta.periodFrom) - graceMs : null
  const to = meta.periodTo && isValidIsoDate(meta.periodTo) ? Date.parse(meta.periodTo) + graceMs : null

  transactions.forEach((tx, i) => {
    if (!isValidIsoDate(tx.date)) {
      issues.push({
        code: 'INVALID_DATE',
        severity: 'error',
        message: `row ${i}: "${tx.date}" is not a valid ISO date`,
        txIndex: i,
      })
      return
    }
    const t = Date.parse(tx.date)
    if ((from !== null && t < from) || (to !== null && t > to)) {
      issues.push({
        code: 'DATE_OUTSIDE_PERIOD',
        severity: 'warning',
        message: `row ${i}: ${tx.date} lies outside the statement period`,
        txIndex: i,
      })
    }
  })
  return issues
}

/**
 * Flags repeated (date, amounts, description-stem) rows. Warning only:
 * genuinely identical transactions happen (two equal coffee purchases), but
 * a cluster of duplicates usually means a page was double-extracted.
 */
export function checkDuplicates(transactions: ReadonlyArray<ParsedTransaction>): ValidationIssue[] {
  const seen = new Map<string, number>()
  const issues: ValidationIssue[] = []
  transactions.forEach((tx, i) => {
    const stem = tx.description.toLowerCase().replace(/\s+/g, ' ').slice(0, 40)
    const key = `${tx.date}|${tx.debit ?? '_'}|${tx.credit ?? '_'}|${stem}`
    const firstIndex = seen.get(key)
    if (firstIndex !== undefined) {
      issues.push({
        code: 'POSSIBLE_DUPLICATE',
        severity: 'warning',
        message: `row ${i} repeats row ${firstIndex} (${tx.date}, same amounts and description)`,
        txIndex: i,
      })
    } else {
      seen.set(key, i)
    }
  })
  return issues
}
