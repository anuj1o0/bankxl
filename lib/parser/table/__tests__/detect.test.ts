import { describe, it, expect } from 'vitest'
import { TableDetectionStage } from '../detect'
import { PdfTextExtractionStage } from '../../pdf/extract-text'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { PdfTextContent } from '../../pdf/types'
import { makeDigitalPdf, makeStatementPdf } from '../../../../tests/helpers/pdf-fixtures'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

const extract = new PdfTextExtractionStage()
const detect = new TableDetectionStage()

async function extractContent(pdf: Buffer): Promise<PdfTextContent> {
  return (await runStage(extract, pdf, ctx())).data
}

describe('TableDetectionStage (integration through real PDF fixtures)', () => {
  it('detects a single-page table: header fields, rows, footer excluded', async () => {
    const pdf = await makeStatementPdf([
      {
        withHeader: true,
        rows: [
          { date: '01/04/2026', desc: 'UPI/DR/510298/PhonePe', ref: 'UTR510298', debit: '1,500.00', balance: '43,730.50' },
          { date: '02/04/2026', desc: 'NEFT-HDFC0001234-SALARY', credit: '85,000.00', balance: '1,28,730.50' },
          { date: '03/04/2026', desc: 'ATM-CASH-WDL-MUMBAI', debit: '10,000.00', balance: '1,18,730.50' },
        ],
        withFooter: true,
      },
    ])
    const result = await runStage(detect, await extractContent(pdf), ctx())

    expect(result.data.tables).toHaveLength(1)
    const table = result.data.tables[0]
    expect(table.inheritedHeader).toBe(false)
    expect(table.columns.map(c => c.suggestedField)).toEqual([
      'date',
      'description',
      'reference',
      'debit',
      'credit',
      'balance',
    ])
    // 3 transaction rows; the "Statement Summary"/totals footer is excluded.
    expect(table.rows).toHaveLength(3)
    expect(table.rows[0].cells[0]).toBe('01/04/2026')
    expect(table.rows[0].cells[3]).toBe('1,500.00')
    expect(table.rows[1].cells[4]).toBe('85,000.00')
    expect(result.confidence).toBe(1)
  })

  it('merges wrapped descriptions into their row', async () => {
    const pdf = await makeStatementPdf([
      {
        withHeader: true,
        rows: [
          {
            date: '01/04/2026',
            desc: 'UPI/DR/510298/PhonePe',
            descContinuations: ['GROCERY MART PVT LTD', 'MUMBAI 400001'],
            debit: '1,500.00',
            balance: '43,730.50',
          },
          { date: '02/04/2026', desc: 'SIMPLE ROW', credit: '2,000.00', balance: '45,730.50' },
        ],
      },
    ])
    const result = await runStage(detect, await extractContent(pdf), ctx())
    const rows = result.data.tables[0].rows
    expect(rows).toHaveLength(2)
    expect(rows[0].cells[1]).toBe('UPI/DR/510298/PhonePe GROCERY MART PVT LTD MUMBAI 400001')
    expect(rows[0].mergedLines).toBe(2)
    expect(rows[1].cells[1]).toBe('SIMPLE ROW')
  })

  it('inherits column geometry on a headerless continuation page', async () => {
    const pdf = await makeStatementPdf([
      {
        withHeader: true,
        rows: [{ date: '01/04/2026', desc: 'ROW ON PAGE ONE', debit: '100.00', balance: '900.00' }],
      },
      {
        withHeader: false,
        rows: [
          { date: '02/04/2026', desc: 'ROW ON PAGE TWO', debit: '200.00', balance: '700.00' },
          { date: '03/04/2026', desc: 'ANOTHER PAGE TWO ROW', credit: '50.00', balance: '750.00' },
        ],
      },
    ])
    const result = await runStage(detect, await extractContent(pdf), ctx())

    expect(result.data.tables).toHaveLength(2)
    expect(result.data.tables[0].inheritedHeader).toBe(false)
    expect(result.data.tables[1].inheritedHeader).toBe(true)
    expect(result.data.tables[1].rows).toHaveLength(2)
    expect(result.data.tables[1].rows[0].cells[1]).toBe('ROW ON PAGE TWO')
    expect(result.warnings.some(w => w.code === 'HEADER_INHERITED' && w.page === 2)).toBe(true)
  })

  it('throws NO_TABLE_FOUND for a document with no transaction table', async () => {
    const pdf = await makeDigitalPdf([
      ['HDFC BANK LIMITED', 'Registered Office: Mumbai', 'This letter confirms your address change.'],
    ])
    await expect(runStage(detect, await extractContent(pdf), ctx())).rejects.toMatchObject({
      name: 'ParserError',
      code: 'NO_TABLE_FOUND',
      stage: 'table-detection',
    })
  })
})
