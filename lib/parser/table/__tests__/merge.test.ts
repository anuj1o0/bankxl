import { describe, it, expect } from 'vitest'
import { mergeContinuationRows, type CandidateRow, type UnmergedTable } from '../merge'
import type { ColumnAnchor } from '../types'

const COLUMNS: ColumnAnchor[] = [
  { index: 0, xStart: 40, xEnd: 80, headerText: 'Date', suggestedField: 'date' },
  { index: 1, xStart: 115, xEnd: 290, headerText: 'Particulars', suggestedField: 'description' },
  { index: 2, xStart: 380, xEnd: 440, headerText: 'Withdrawal Amt.', suggestedField: 'debit' },
  { index: 3, xStart: 525, xEnd: 590, headerText: 'Closing Balance', suggestedField: 'balance' },
]

function anchor(page: number, y: number, desc: string): CandidateRow {
  return { page, y, yEnd: y + 10, cells: ['01/04/2026', desc, '1,500.00', '45,230.50'], kind: 'anchor' }
}

function continuation(page: number, y: number, fragment: string): CandidateRow {
  return { page, y, yEnd: y + 10, cells: ['', fragment, '', ''], kind: 'continuation' }
}

function table(page: number, candidates: CandidateRow[], inherited = false): UnmergedTable {
  return { page, columns: COLUMNS, headerY: inherited ? null : 60, inheritedHeader: inherited, candidates }
}

describe('mergeContinuationRows', () => {
  it('appends an adjacent continuation to the previous row description', () => {
    const { tables, orphanedContinuations } = mergeContinuationRows([
      table(1, [anchor(1, 100, 'UPI/DR/510298/PhonePe'), continuation(1, 114, 'GROCERY MART PVT LTD'), anchor(1, 128, 'NEFT-HDFC0001234')]),
    ])
    expect(orphanedContinuations).toBe(0)
    expect(tables[0].rows).toHaveLength(2)
    expect(tables[0].rows[0].cells[1]).toBe('UPI/DR/510298/PhonePe GROCERY MART PVT LTD')
    expect(tables[0].rows[0].mergedLines).toBe(1)
    expect(tables[0].rows[1].mergedLines).toBe(0)
  })

  it('merges multiple consecutive continuation lines into the same row', () => {
    const { tables } = mergeContinuationRows([
      table(1, [
        anchor(1, 100, 'IMPS/P2A/6017'),
        continuation(1, 114, 'RAKESH KUMAR'),
        continuation(1, 128, 'OKAXIS REF 601745'),
      ]),
    ])
    expect(tables[0].rows[0].cells[1]).toBe('IMPS/P2A/6017 RAKESH KUMAR OKAXIS REF 601745')
    expect(tables[0].rows[0].mergedLines).toBe(2)
  })

  it('drops page-furniture continuations instead of merging them', () => {
    const { tables, orphanedContinuations } = mergeContinuationRows([
      table(1, [anchor(1, 100, 'UPI/DR/1'), continuation(1, 114, 'Page 1 of 4')]),
    ])
    expect(tables[0].rows[0].cells[1]).toBe('UPI/DR/1')
    expect(orphanedContinuations).toBe(1)
  })

  it('drops continuations that are too far below the previous row', () => {
    const { tables, orphanedContinuations } = mergeContinuationRows([
      table(1, [anchor(1, 100, 'UPI/DR/1'), continuation(1, 100 + 10 + 60, 'FAR AWAY TEXT')]),
    ])
    expect(tables[0].rows[0].cells[1]).toBe('UPI/DR/1')
    expect(orphanedContinuations).toBe(1)
  })

  it('merges a continuation at the top of the next page into the previous page last row', () => {
    const { tables, orphanedContinuations } = mergeContinuationRows([
      table(1, [anchor(1, 700, 'UPI/DR/510298/PhonePe')]),
      table(2, [continuation(2, 70, 'WRAPPED TAIL FROM PAGE 1'), anchor(2, 84, 'ATM-CASH-WDL')], true),
    ])
    expect(orphanedContinuations).toBe(0)
    expect(tables[0].rows[0].cells[1]).toBe('UPI/DR/510298/PhonePe WRAPPED TAIL FROM PAGE 1')
    expect(tables[1].rows).toHaveLength(1)
    expect(tables[1].rows[0].cells[1]).toBe('ATM-CASH-WDL')
  })

  it('orphans a continuation with no preceding row', () => {
    const { tables, orphanedContinuations } = mergeContinuationRows([
      table(1, [continuation(1, 80, 'STRAY TEXT BEFORE ANY ROW'), anchor(1, 100, 'UPI/DR/1')]),
    ])
    expect(orphanedContinuations).toBe(1)
    expect(tables[0].rows).toHaveLength(1)
  })

  it('keeps amountOnly candidates as their own rows', () => {
    const amountOnly: CandidateRow = {
      page: 1,
      y: 114,
      yEnd: 124,
      cells: ['', 'INTEREST CAPITALISED', '250.00', '45,480.50'],
      kind: 'amountOnly',
    }
    const { tables } = mergeContinuationRows([table(1, [anchor(1, 100, 'UPI/DR/1'), amountOnly])])
    expect(tables[0].rows).toHaveLength(2)
    expect(tables[0].rows[1].cells[1]).toBe('INTEREST CAPITALISED')
  })
})
