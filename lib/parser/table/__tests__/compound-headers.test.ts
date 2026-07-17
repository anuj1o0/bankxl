/**
 * Regression tests for real-statement geometry findings: compound header
 * cells and overdraft notation — each observed on an actual PDF before
 * being handled.
 */
import { describe, it, expect } from 'vitest'
import { expandCompoundHeaderCells } from '../header-lexicon'
import { looksLikeAmount } from '../patterns'
import type { Cell } from '../types'

function cell(text: string, x: number, xEnd: number): Cell {
  return { text, x, xEnd }
}

describe('expandCompoundHeaderCells', () => {
  it('splits "Debit (Rs) Credit (Rs)" into two field cells (real SBI shape)', () => {
    const out = expandCompoundHeaderCells([cell('Debit (Rs) Credit (Rs)', 400, 520)])
    expect(out).toHaveLength(2)
    expect(out[0].text).toBe('Debit (Rs)')
    expect(out[1].text).toBe('Credit (Rs)')
    // x-space is divided at the second match's start
    expect(out[0].x).toBe(400)
    expect(out[1].xEnd).toBe(520)
    expect(out[0].xEnd).toBeLessThanOrEqual(out[1].x)
  })

  it('splits "Chq/Ref No Withdrawal" into reference + debit cells (real stress shape)', () => {
    const out = expandCompoundHeaderCells([cell('Chq/Ref No Withdrawal', 343, 428)])
    expect(out).toHaveLength(2)
    expect(out[0].text).toBe('Chq/Ref No')
    expect(out[1].text).toBe('Withdrawal')
  })

  it('leaves single-field and non-field cells untouched', () => {
    const cells = [cell('Date', 40, 62), cell('Particulars', 115, 170), cell('MUMBAI BRANCH', 300, 380)]
    expect(expandCompoundHeaderCells(cells)).toEqual(cells)
  })

  it('does not split "Value Date" (one field, two words)', () => {
    const out = expandCompoundHeaderCells([cell('Value Date', 80, 130)])
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe('Value Date')
  })
})

describe('overdraft notation', () => {
  it('accepts "(22,736.59) OD" as an amount shape', () => {
    expect(looksLikeAmount('(22,736.59) OD')).toBe(true)
    expect(looksLikeAmount('1,234.56 OD')).toBe(true)
  })
})
