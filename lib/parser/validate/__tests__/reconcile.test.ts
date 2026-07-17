import { describe, it, expect } from 'vitest'
import { reconcileBalances } from '../reconcile'
import type { ParsedTransaction } from '../../core/types'

/** Builds a transaction row; balance defaults to null (unprinted). */
function tx(
  debit: number | null,
  credit: number | null,
  balance: number | null,
  date = '2026-04-01'
): ParsedTransaction {
  return { date, description: 'TEST', reference: null, debit, credit, balance, page: 1, confidence: 1 }
}

const NO_META = { openingBalance: null, closingBalance: null }

describe('reconcileBalances', () => {
  it('fully reconciles a clean forward chain with opening and closing', () => {
    const result = reconcileBalances(
      [tx(1500, null, 43730.5), tx(null, 85000, 128730.5), tx(10000, null, 118730.5)],
      { openingBalance: 45230.5, closingBalance: 118730.5 }
    )
    // 3 row links (opening anchors the first) + closing link
    expect(result.checkableLinks).toBe(4)
    expect(result.reconciledLinks).toBe(4)
    expect(result.fraction).toBe(1)
    expect(result.direction).toBe('forward')
    expect(result.breaks).toHaveLength(0)
    expect(result.closingMatched).toBe(true)
    expect(result.impossible).toBe(false)
  })

  it('anchors on the first printed balance when no opening balance exists', () => {
    const result = reconcileBalances([tx(100, null, 900), tx(200, null, 700), tx(null, 50, 750)], NO_META)
    // First balance is the anchor (unchecked); the next two are links.
    expect(result.checkableLinks).toBe(2)
    expect(result.fraction).toBe(1)
  })

  it('reports one break and resyncs after a single bad balance', () => {
    const result = reconcileBalances(
      [tx(100, null, 900), tx(200, null, 999), tx(null, 50, 1049), tx(100, null, 949)],
      NO_META
    )
    // Row 1 breaks (900-200=700 ≠ 999) but rows 2 and 3 chain from 999.
    expect(result.checkableLinks).toBe(3)
    expect(result.reconciledLinks).toBe(2)
    expect(result.breaks).toHaveLength(1)
    expect(result.breaks[0]).toMatchObject({ txIndex: 1, expected: 700, actual: 999 })
  })

  it('detects a missing row as a single break', () => {
    // Chain built as 1000 → 900 → [800 missing] → 700
    const result = reconcileBalances([tx(100, null, 900), tx(100, null, 700)], { openingBalance: 1000, closingBalance: null })
    expect(result.checkableLinks).toBe(2)
    expect(result.reconciledLinks).toBe(1)
    expect(result.breaks[0]).toMatchObject({ txIndex: 1, expected: 800, actual: 700 })
  })

  it('carries expectation through rows without printed balances', () => {
    const result = reconcileBalances(
      [tx(100, null, 900), tx(50, null, null), tx(50, null, null), tx(100, null, 700)],
      NO_META
    )
    // Only the final row is checkable: 900 - 50 - 50 - 100 = 700 ✓
    expect(result.checkableLinks).toBe(1)
    expect(result.reconciledLinks).toBe(1)
    expect(result.fraction).toBe(1)
  })

  it('reconciles newest-first statements in reverse', () => {
    // Chronological: 1000 → 900 → 700 → 750; printed newest-first.
    const chronological = [tx(100, null, 900), tx(200, null, 700), tx(null, 50, 750)]
    const printed = [...chronological].reverse()
    const result = reconcileBalances(printed, NO_META)
    expect(result.direction).toBe('reverse')
    expect(result.fraction).toBe(1)
  })

  it('is impossible when no balances are printed', () => {
    const result = reconcileBalances([tx(100, null, null), tx(null, 50, null)], NO_META)
    expect(result.impossible).toBe(true)
    expect(result.fraction).toBe(1)
    expect(result.direction).toBe('unknown')
  })

  it('counts a closing-balance mismatch as a break', () => {
    const result = reconcileBalances([tx(100, null, 900)], { openingBalance: 1000, closingBalance: 850 })
    expect(result.closingMatched).toBe(false)
    expect(result.breaks.some(b => b.actual === 850)).toBe(true)
  })

  it('handles overdraft (negative) balances', () => {
    const result = reconcileBalances([tx(1500, null, -500), tx(null, 200, -300)], { openingBalance: 1000, closingBalance: -300 })
    expect(result.fraction).toBe(1)
  })

  it('returns impossible for an empty statement', () => {
    const result = reconcileBalances([], NO_META)
    expect(result.impossible).toBe(true)
    expect(result.checkableLinks).toBe(0)
  })
})
