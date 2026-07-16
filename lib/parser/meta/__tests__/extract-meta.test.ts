import { describe, it, expect } from 'vitest'
import { MetadataExtractionStage } from '../extract-meta'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { PdfTextContent } from '../../pdf/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

/** One page whose lines are the given texts (one item per line). */
function doc(...lines: string[]): PdfTextContent {
  return {
    totalPages: 1,
    pages: [
      {
        pageNumber: 1,
        width: 600,
        height: 800,
        charCount: lines.join('').length,
        items: lines.map((text, i) => ({ text, x: 40, y: 50 + i * 20, width: 200, height: 10, fontName: 'F1' })),
      },
    ],
  }
}

const stage = new MetadataExtractionStage()

describe('MetadataExtractionStage', () => {
  it('extracts period, balances, account number, and IFSC', async () => {
    const result = await runStage(
      stage,
      doc(
        'HDFC BANK Statement of Account',
        'A/C No : 50100123456789   IFSC : HDFC0001234',
        'Statement Period : 01/04/2026 To 30/04/2026',
        'Opening Balance : 45,230.50',
        'Closing Balance : 1,16,000.00'
      ),
      ctx()
    )
    expect(result.data).toMatchObject({
      accountNumber: '50100123456789',
      ifsc: 'HDFC0001234',
      periodFrom: '2026-04-01',
      periodTo: '2026-04-30',
      openingBalance: 45230.5,
      closingBalance: 116000,
      currency: 'INR',
      totalPages: 1,
    })
    expect(result.confidence).toBe(1)
  })

  it('leaves missing fields null without failing', async () => {
    const result = await runStage(stage, doc('Some Bank', 'Some Account Statement'), ctx())
    expect(result.data.openingBalance).toBeNull()
    expect(result.data.periodFrom).toBeNull()
    expect(result.data.ifsc).toBeNull()
    expect(result.confidence).toBeLessThan(1)
  })

  it('does not pair dates from unrelated lines as a period', async () => {
    const result = await runStage(
      stage,
      doc('Statement generated on 15/07/2026', 'Printed at branch on 16/07/2026'),
      ctx()
    )
    // Each line has only ONE date; no single line yields a from/to pair.
    expect(result.data.periodFrom).toBeNull()
  })

  it('handles masked account numbers', async () => {
    const result = await runStage(stage, doc('Account No: 5010XXXXXX6789'), ctx())
    expect(result.data.accountNumber).toBe('5010XXXXXX6789')
  })

  it('ignores counterparty IFSC codes in transaction narrations', async () => {
    // Real bug: a NEFT narration's Axis IFSC (UTIB...) was reported as the
    // account IFSC on an HDFC statement. Identity fields only scan the
    // letterhead region (first 30 lines).
    const letterhead = ['HDFC BANK Statement', 'IFSC : HDFC0001234']
    const filler = Array.from({ length: 40 }, (_, i) => `01/04/2026 UPI PAYMENT ROW ${i} 100.00`)
    const narration = ['NEFT/UTIB0000509/SOME COUNTERPARTY/AXIS BANK TRANSFER']
    const result = await runStage(stage, doc(...letterhead, ...filler, ...narration), ctx())
    expect(result.data.ifsc).toBe('HDFC0001234')
  })

  it('does not take an IFSC from narrations when the letterhead has none', async () => {
    const filler = Array.from({ length: 40 }, (_, i) => `filler line ${i}`)
    const result = await runStage(stage, doc(...filler, 'NEFT/UTIB0000509/COUNTERPARTY'), ctx())
    expect(result.data.ifsc).toBeNull()
  })
})
