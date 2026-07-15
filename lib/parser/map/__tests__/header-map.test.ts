import { describe, it, expect } from 'vitest'
import { HeaderMappingStage, resolveMapping } from '../header-map'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { CanonicalField, ColumnAnchor, DetectedTable } from '../../table/types'
import type { BankRules } from '../../banks/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

function col(index: number, headerText: string, suggestedField: CanonicalField | null): ColumnAnchor {
  return { index, xStart: index * 100, xEnd: index * 100 + 80, headerText, suggestedField }
}

function table(columns: ColumnAnchor[]): DetectedTable {
  return { page: 1, columns, headerY: 60, inheritedHeader: false, rows: [] }
}

describe('resolveMapping', () => {
  it('maps a standard six-column layout', () => {
    const mapping = resolveMapping(
      table([
        col(0, 'Date', 'date'),
        col(1, 'Particulars', 'description'),
        col(2, 'Chq./Ref.No.', 'reference'),
        col(3, 'Withdrawal Amt.', 'debit'),
        col(4, 'Deposit Amt.', 'credit'),
        col(5, 'Closing Balance', 'balance'),
      ]),
      null
    )
    expect(mapping).toEqual({ date: 0, description: 1, reference: 2, debit: 3, credit: 4, balance: 5 })
  })

  it('assigns a second date column to valueDate', () => {
    const mapping = resolveMapping(
      table([
        col(0, 'Date', 'date'),
        col(1, 'Narration', 'description'),
        col(2, 'Value Dt', 'date'), // lexicon may generalize; mapping disambiguates
        col(3, 'Debit', 'debit'),
        col(4, 'Balance', 'balance'),
      ]),
      null
    )
    expect(mapping).toMatchObject({ date: 0, valueDate: 2 })
  })

  it('lets the rightmost balance column win', () => {
    const mapping = resolveMapping(
      table([
        col(0, 'Date', 'date'),
        col(1, 'Particulars', 'description'),
        col(2, 'Opening Balance', 'balance'),
        col(3, 'Debit', 'debit'),
        col(4, 'Closing Balance', 'balance'),
      ]),
      null
    )
    expect(mapping?.balance).toBe(4)
  })

  it('accepts the single-Amount + Dr/Cr layout as a money mapping', () => {
    const mapping = resolveMapping(
      table([
        col(0, 'Date', 'date'),
        col(1, 'Particulars', 'description'),
        col(2, 'Amount', 'amount'),
        col(3, 'Dr/Cr', 'drcr'),
        col(4, 'Balance', 'balance'),
      ]),
      null
    )
    expect(mapping).toMatchObject({ amount: 2, drcr: 3 })
  })

  it('returns null without a date column', () => {
    expect(
      resolveMapping(table([col(0, 'Particulars', 'description'), col(1, 'Debit', 'debit')]), null)
    ).toBeNull()
  })

  it('returns null when Amount lacks a Dr/Cr companion', () => {
    expect(
      resolveMapping(
        table([col(0, 'Date', 'date'), col(1, 'Particulars', 'description'), col(2, 'Amount', 'amount')]),
        null
      )
    ).toBeNull()
  })

  it('applies bank header overrides before generic resolution', () => {
    const bank: BankRules = {
      bankId: 'test',
      bankName: 'Test Bank',
      namePatterns: [],
      ifscPrefixes: [],
      // This bank prints "Tran Particulars" which the lexicon can't place.
      headerOverrides: { 'tran particulars': 'description' },
    }
    const mapping = resolveMapping(
      table([
        col(0, 'Date', 'date'),
        col(1, 'Tran Particulars', null),
        col(2, 'Debit', 'debit'),
        col(3, 'Balance', 'balance'),
      ]),
      bank
    )
    expect(mapping?.description).toBe(1)
  })
})

describe('HeaderMappingStage', () => {
  const stage = new HeaderMappingStage()

  it('maps usable tables and warns about unmappable ones', async () => {
    const good = table([
      col(0, 'Date', 'date'),
      col(1, 'Particulars', 'description'),
      col(2, 'Debit', 'debit'),
      col(3, 'Balance', 'balance'),
    ])
    const bad = table([col(0, 'Foo', null), col(1, 'Bar', null), col(2, 'Baz', null)])
    const result = await runStage(stage, { detection: { tables: [good, bad] }, bank: null }, ctx())
    expect(result.data.tables).toHaveLength(1)
    expect(result.warnings.some(w => w.code === 'TABLE_UNMAPPABLE')).toBe(true)
    expect(result.confidence).toBe(0.5)
  })

  it('throws HEADERS_UNRECOGNIZED when no table maps', async () => {
    const bad = table([col(0, 'Foo', null), col(1, 'Bar', null), col(2, 'Baz', null)])
    await expect(runStage(stage, { detection: { tables: [bad] }, bank: null }, ctx())).rejects.toMatchObject({
      name: 'ParserError',
      code: 'HEADERS_UNRECOGNIZED',
      stage: 'header-mapping',
    })
  })
})
