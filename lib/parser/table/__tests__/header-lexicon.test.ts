import { describe, it, expect } from 'vitest'
import { matchHeaderCell, scoreHeaderLine } from '../header-lexicon'
import type { Cell } from '../types'

function cell(text: string, x = 0): Cell {
  return { text, x, xEnd: x + text.length * 5 }
}

describe('matchHeaderCell', () => {
  it.each([
    ['Date', 'date'],
    ['Txn Date', 'date'],
    ['Value Dt', 'valueDate'],
    ['Particulars', 'description'],
    ['Narration', 'description'],
    ['Transaction Remarks', 'description'],
    ['Withdrawal Amt.', 'debit'],
    ['DEBIT', 'debit'],
    ['Deposit Amt.', 'credit'],
    ['Chq./Ref.No.', 'reference'],
    ['UTR No', 'reference'],
    ['Closing Balance', 'balance'],
    ['Balance', 'balance'],
    ['Amount', 'amount'],
    ['Dr/Cr', 'drcr'],
  ])('maps %s to %s', (text, field) => {
    expect(matchHeaderCell(text)).toBe(field)
  })

  it('matches decorated headers by substring', () => {
    expect(matchHeaderCell('Withdrawal Amt (INR)')).toBe('debit')
    expect(matchHeaderCell('Closing Balance (₹)')).toBe('balance')
  })

  it('prefers specific phrases over generic words', () => {
    // "Value Date" must not be swallowed by the generic "date" entry.
    expect(matchHeaderCell('Value Date')).toBe('valueDate')
    expect(matchHeaderCell('Withdrawal Amount')).toBe('debit')
  })

  it('returns null for non-header text', () => {
    expect(matchHeaderCell('MUMBAI MAIN BRANCH')).toBeNull()
    expect(matchHeaderCell('01/04/2026')).toBeNull()
    expect(matchHeaderCell('')).toBeNull()
  })
})

describe('scoreHeaderLine', () => {
  it('accepts a full statement header', () => {
    const score = scoreHeaderLine([
      cell('Date'),
      cell('Particulars', 100),
      cell('Chq./Ref.No.', 300),
      cell('Withdrawal Amt.', 380),
      cell('Deposit Amt.', 455),
      cell('Closing Balance', 525),
    ])
    expect(score.isHeader).toBe(true)
    expect(score.matchedFields).toEqual(
      expect.arrayContaining(['date', 'description', 'reference', 'debit', 'credit', 'balance'])
    )
    expect(score.cellFields).toEqual(['date', 'description', 'reference', 'debit', 'credit', 'balance'])
  })

  it('rejects a line with too few field matches', () => {
    expect(scoreHeaderLine([cell('Date'), cell('Balance', 200)]).isHeader).toBe(false)
  })

  it('rejects field-rich lines lacking a date column', () => {
    const score = scoreHeaderLine([cell('Particulars'), cell('Debit', 200), cell('Credit', 300)])
    expect(score.isHeader).toBe(false)
  })

  it('rejects field-rich lines lacking any money column', () => {
    const score = scoreHeaderLine([cell('Date'), cell('Particulars', 200), cell('Ref No', 300)])
    expect(score.isHeader).toBe(false)
  })

  it('rejects prose', () => {
    const score = scoreHeaderLine([
      cell('This'),
      cell('statement', 60),
      cell('is', 120),
      cell('computer', 160),
      cell('generated', 220),
    ])
    expect(score.isHeader).toBe(false)
  })
})
