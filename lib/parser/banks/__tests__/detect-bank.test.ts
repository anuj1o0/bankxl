import { describe, it, expect } from 'vitest'
import { BankDetectionStage } from '../detect-bank'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { PdfTextContent } from '../../pdf/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

function doc(...pageTexts: string[][]): PdfTextContent {
  return {
    totalPages: pageTexts.length,
    pages: pageTexts.map((texts, i) => ({
      pageNumber: i + 1,
      width: 600,
      height: 800,
      charCount: texts.join('').length,
      items: texts.map((text, j) => ({ text, x: 40, y: 50 + j * 16, width: 100, height: 10, fontName: 'F1' })),
    })),
  }
}

const stage = new BankDetectionStage()

describe('BankDetectionStage', () => {
  it('detects HDFC by letterhead and IFSC together with full confidence', async () => {
    const result = await runStage(stage, doc(['HDFC BANK Statement of Account', 'IFSC: HDFC0001234']), ctx())
    expect(result.data.bankId).toBe('hdfc')
    expect(result.data.matchedBy).toBe('name+ifsc')
    expect(result.data.rules?.bankId).toBe('hdfc')
    expect(result.confidence).toBe(1)
  })

  it('detects by name alone', async () => {
    const result = await runStage(stage, doc(['STATE BANK OF INDIA', 'Account Statement']), ctx())
    expect(result.data.bankId).toBe('sbi')
    expect(result.data.matchedBy).toBe('name')
  })

  it('detects by IFSC alone', async () => {
    const result = await runStage(stage, doc(['Account Statement', 'branch ifsc ICIC0004321']), ctx())
    expect(result.data.bankId).toBe('icici')
    expect(result.data.matchedBy).toBe('ifsc')
  })

  it('prefers the letterhead when signals conflict, and warns', async () => {
    const result = await runStage(stage, doc(['AXIS BANK LTD', 'transfer to HDFC0009999']), ctx())
    expect(result.data.bankId).toBe('axis')
    expect(result.warnings.some(w => w.code === 'BANK_SIGNAL_CONFLICT')).toBe(true)
  })

  it('returns null with a warning for unknown banks', async () => {
    const result = await runStage(stage, doc(['SOME COOPERATIVE BANK', 'Statement']), ctx())
    expect(result.data.bankId).toBeNull()
    expect(result.data.matchedBy).toBe('none')
    expect(result.warnings.some(w => w.code === 'BANK_UNKNOWN')).toBe(true)
  })

  it('ignores bank names beyond the scan page limit (NEFT counterparties)', async () => {
    const result = await runStage(
      stage,
      doc(['Some Statement'], ['account details'], ['NEFT FROM HDFC BANK CUSTOMER']),
      ctx()
    )
    expect(result.data.bankId).toBeNull()
  })
})
