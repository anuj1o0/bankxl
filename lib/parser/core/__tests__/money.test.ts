import { describe, it, expect } from 'vitest'
import { amountsEqual, isUsableAmount, MONEY_TOLERANCE } from '../money'

describe('amountsEqual', () => {
  it('treats sub-paisa differences as equal', () => {
    expect(amountsEqual(100, 100.005)).toBe(true)
    expect(amountsEqual(0.1 + 0.2, 0.3)).toBe(true) // float noise
  })

  it('treats >1 paisa differences as different', () => {
    expect(amountsEqual(100, 100.02)).toBe(false)
    expect(amountsEqual(100, 99.98)).toBe(false)
  })

  it('is symmetric', () => {
    expect(amountsEqual(45230.5, 45230.51)).toBe(amountsEqual(45230.51, 45230.5))
  })

  it('tolerance sits just above one paisa', () => {
    expect(MONEY_TOLERANCE).toBeGreaterThan(0.01)
    expect(MONEY_TOLERANCE).toBeLessThan(0.02)
  })
})

describe('isUsableAmount', () => {
  it('accepts finite numbers including negatives (overdraft balances)', () => {
    expect(isUsableAmount(100.5)).toBe(true)
    expect(isUsableAmount(-3653.02)).toBe(true)
    expect(isUsableAmount(0)).toBe(true)
  })

  it('rejects null, NaN, and infinities', () => {
    expect(isUsableAmount(null)).toBe(false)
    expect(isUsableAmount(Number.NaN)).toBe(false)
    expect(isUsableAmount(Number.POSITIVE_INFINITY)).toBe(false)
  })
})
