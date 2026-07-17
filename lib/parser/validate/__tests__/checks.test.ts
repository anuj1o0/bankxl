import { describe, it, expect } from 'vitest'
import { checkAmounts, checkDates, checkDuplicates, isValidIsoDate } from '../checks'
import type { ParsedTransaction } from '../../core/types'

function tx(overrides: Partial<ParsedTransaction>): ParsedTransaction {
  return {
    date: '2026-04-01',
    description: 'TEST ROW',
    reference: null,
    debit: 100,
    credit: null,
    balance: null,
    page: 1,
    confidence: 1,
    ...overrides,
  }
}

describe('isValidIsoDate', () => {
  it.each(['2026-04-01', '2024-02-29', '1999-12-31'])('accepts %s', d => {
    expect(isValidIsoDate(d)).toBe(true)
  })
  it.each(['2026-02-30', '2026-13-01', '01/04/2026', '2026-4-1', '', 'not a date'])('rejects %s', d => {
    expect(isValidIsoDate(d)).toBe(false)
  })
})

describe('checkAmounts', () => {
  it('errors when both debit and credit are set', () => {
    const issues = checkAmounts([tx({ debit: 100, credit: 50 })])
    expect(issues.some(i => i.code === 'BOTH_DEBIT_AND_CREDIT' && i.severity === 'error')).toBe(true)
  })

  it('errors when neither debit nor credit is set', () => {
    const issues = checkAmounts([tx({ debit: null, credit: null })])
    expect(issues.some(i => i.code === 'NO_AMOUNT')).toBe(true)
  })

  it('errors on negative amounts', () => {
    const issues = checkAmounts([tx({ debit: -500 })])
    expect(issues.some(i => i.code === 'INVALID_AMOUNT')).toBe(true)
  })

  it('warns on zero and implausibly large amounts', () => {
    const issues = checkAmounts([tx({ debit: 0 }), tx({ credit: 5_000_000_000, debit: null })])
    expect(issues.some(i => i.code === 'ZERO_AMOUNT' && i.severity === 'warning')).toBe(true)
    expect(issues.some(i => i.code === 'IMPLAUSIBLE_AMOUNT' && i.severity === 'warning')).toBe(true)
  })

  it('passes clean rows silently', () => {
    expect(checkAmounts([tx({}), tx({ debit: null, credit: 2500.75 })])).toHaveLength(0)
  })
})

describe('checkDates', () => {
  const period = { periodFrom: '2026-04-01', periodTo: '2026-04-30' }

  it('errors on non-ISO dates', () => {
    const issues = checkDates([tx({ date: '01/04/2026' })], period)
    expect(issues.some(i => i.code === 'INVALID_DATE' && i.severity === 'error')).toBe(true)
  })

  it('warns on dates outside the period beyond the grace window', () => {
    const issues = checkDates([tx({ date: '2026-06-15' })], period)
    expect(issues.some(i => i.code === 'DATE_OUTSIDE_PERIOD' && i.severity === 'warning')).toBe(true)
  })

  it('accepts dates within the grace window around the period', () => {
    expect(checkDates([tx({ date: '2026-05-03' })], period)).toHaveLength(0) // +3 days
  })

  it('skips period checks when the period is unknown', () => {
    expect(checkDates([tx({ date: '2031-01-01' })], { periodFrom: null, periodTo: null })).toHaveLength(0)
  })
})

describe('checkDuplicates', () => {
  it('warns on repeated date+amount+description rows', () => {
    const a = tx({ description: 'UPI/DR/510298/PhonePe', debit: 150 })
    const issues = checkDuplicates([a, tx({ description: 'UPI/DR/510298/PhonePe', debit: 150 })])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ code: 'POSSIBLE_DUPLICATE', severity: 'warning', txIndex: 1 })
  })

  it('does not flag rows differing in amount or date', () => {
    const issues = checkDuplicates([
      tx({ debit: 150 }),
      tx({ debit: 151 }),
      tx({ debit: 150, date: '2026-04-02' }),
    ])
    expect(issues).toHaveLength(0)
  })
})
