import { describe, it, expect } from 'vitest'
import { RowParsingStage } from '../parse-row'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { ColumnMapping, MappedTable } from '../../map/header-map'
import type { RawRow } from '../../table/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

const SIX_COL: ColumnMapping = { date: 0, description: 1, reference: 2, debit: 3, credit: 4, balance: 5 }

function row(cells: string[], page = 1): RawRow {
  return { page, y: 100, cells, mergedLines: 0 }
}

function mapped(mapping: ColumnMapping, rows: RawRow[]): MappedTable {
  return {
    mapping,
    table: { page: rows[0]?.page ?? 1, columns: [], headerY: 60, inheritedHeader: false, rows },
  }
}

const stage = new RowParsingStage()

async function parse(tables: MappedTable[], bank = null) {
  return runStage(stage, { mapped: { tables }, bank }, ctx())
}

describe('RowParsingStage', () => {
  it('parses clean rows into canonical transactions', async () => {
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'UPI/DR/510298/PhonePe', 'UTR510298', '1,500.00', '', '43,730.50']),
        row(['02/04/2026', 'NEFT SALARY', '', '', '85,000.00', '1,28,730.50']),
      ]),
    ])
    expect(result.data.transactions).toEqual([
      {
        date: '2026-04-01',
        description: 'UPI/DR/510298/PhonePe',
        reference: 'UTR510298',
        debit: 1500,
        credit: null,
        balance: 43730.5,
        page: 1,
        confidence: 1,
      },
      {
        date: '2026-04-02',
        description: 'NEFT SALARY',
        reference: null,
        debit: null,
        credit: 85000,
        balance: 128730.5,
        page: 1,
        confidence: 1,
      },
    ])
    expect(result.confidence).toBe(1)
  })

  it('drops junk rows (B/F, opening balance, totals) silently', async () => {
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'OPENING BALANCE', '', '', '', '45,230.50']),
        row(['01/04/2026', 'UPI PAYMENT', '', '100.00', '', '45,130.50']),
        row(['', 'TOTAL', '', '100.00', '', '']),
        row(['', 'Balance B/F', '', '', '', '45,130.50']),
      ]),
    ])
    expect(result.data.transactions).toHaveLength(1)
    expect(result.data.junkRowsDropped).toBe(3)
  })

  it('keeps a real transaction that merely mentions a junk word', async () => {
    // "TOTAL FUEL STATION" is a merchant, not a totals row: it has a date
    // and a debit, so the structure check overrides the text match.
    const result = await parse([
      mapped(SIX_COL, [row(['01/04/2026', 'TOTAL FUEL STATION MUMBAI', '', '2,400.00', '', '42,600.00'])]),
    ])
    expect(result.data.transactions).toHaveLength(1)
    expect(result.data.transactions[0].description).toBe('TOTAL FUEL STATION MUMBAI')
    expect(result.data.junkRowsDropped).toBe(0)
  })

  it('treats Dr-suffixed balances as overdraft negatives', async () => {
    const result = await parse([
      mapped(SIX_COL, [row(['01/04/2026', 'EMI DEBIT', '', '5,000.00', '', '3,653.02 Dr'])]),
    ])
    expect(result.data.transactions[0].balance).toBe(-3653.02)
  })

  it('treats "(x) OD" parenthesized overdraft balances as negatives', async () => {
    // Real notation from the stress fixture: accounting parens + OD suffix.
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'CHQ PAID', '', '17,714.22', '', '(42,717.34) OD']),
        row(['02/04/2026', 'INTEREST', '', '', '0.54', '(42,716.80) OD']),
      ]),
    ])
    expect(result.data.transactions[0].balance).toBe(-42717.34)
    expect(result.data.transactions[1].balance).toBe(-42716.8)
  })

  it('drops statement-body totals rows like "TRANSACTION TOTAL"', async () => {
    // Real shape: a dateless row carrying BOTH total debit and total credit,
    // previously exported as a fake transaction that doubled the totals.
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'REAL ROW', '', '100.00', '', '900.00']),
        row(['', 'TRANSACTION TOTAL', '', '1,88,216.29', '1,85,281.00', '']),
      ]),
    ])
    expect(result.data.transactions).toHaveLength(1)
    expect(result.data.junkRowsDropped).toBe(1)
  })

  it('inherits the previous date for dateless amount rows, with penalty', async () => {
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'FIRST', '', '100.00', '', '900.00']),
        row(['', 'SECOND SAME DAY', '', '50.00', '', '850.00']),
      ]),
    ])
    const [first, second] = result.data.transactions
    expect(second.date).toBe('2026-04-01')
    expect(second.confidence).toBeCloseTo(0.7, 5)
    expect(first.confidence).toBe(1)
    expect(result.warnings.some(w => w.code === 'DATES_INHERITED')).toBe(true)
  })

  it('splits Amount + Dr/Cr layouts into debit/credit', async () => {
    const amountMapping: ColumnMapping = { date: 0, description: 1, amount: 2, drcr: 3, balance: 4 }
    const result = await parse([
      mapped(amountMapping, [
        row(['01/04/2026', 'CASH WITHDRAWAL', '2,000.00', 'Dr', '8,000.00']),
        row(['02/04/2026', 'INTEREST', '150.00', 'Cr', '8,150.00']),
      ]),
    ])
    expect(result.data.transactions[0]).toMatchObject({ debit: 2000, credit: null })
    expect(result.data.transactions[1]).toMatchObject({ debit: null, credit: 150 })
  })

  it('drops rows without a parseable amount and warns', async () => {
    const result = await parse([
      mapped(SIX_COL, [
        row(['01/04/2026', 'GOOD ROW', '', '100.00', '', '900.00']),
        row(['02/04/2026', 'NO AMOUNT HERE', '', '', '', '']),
      ]),
    ])
    expect(result.data.transactions).toHaveLength(1)
    expect(result.warnings.some(w => w.code === 'ROW_WITHOUT_AMOUNT')).toBe(true)
    expect(result.confidence).toBe(0.5)
  })

  it('drops a leading dateless row when there is no date to inherit', async () => {
    const result = await parse([
      mapped(SIX_COL, [
        row(['', 'ORPHAN', '', '100.00', '', '900.00']),
        row(['01/04/2026', 'ANCHORED', '', '50.00', '', '850.00']),
      ]),
    ])
    expect(result.data.transactions).toHaveLength(1)
    expect(result.warnings.some(w => w.code === 'ROW_WITHOUT_DATE')).toBe(true)
  })

  it('throws NO_TABLE_FOUND when nothing parses', async () => {
    await expect(
      parse([mapped(SIX_COL, [row(['', 'TOTAL', '', '', '', ''])])])
    ).rejects.toMatchObject({ name: 'ParserError', code: 'NO_TABLE_FOUND', stage: 'row-parsing' })
  })

  it('normalizes whitespace in merged multiline descriptions', async () => {
    const result = await parse([
      mapped(SIX_COL, [row(['01/04/2026', 'UPI/DR/1  GROCERY   MART', '', '100.00', '', '900.00'])]),
    ])
    expect(result.data.transactions[0].description).toBe('UPI/DR/1 GROCERY MART')
  })
})
