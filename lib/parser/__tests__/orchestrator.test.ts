/**
 * Orchestrator tests: parseStatement() as the single public entry point,
 * including the metadata-anchored validation (opening + closing balances
 * from the letterhead join the reconciliation chain).
 */
import { describe, it, expect } from 'vitest'
import { parseStatement, ParserError, toLegacyTransactions, toLegacyMeta, PARSER_VERSION } from '../index'
import { createSilentLogger } from '../core/logger'
import { makeDigitalPdf, makeScannedLikePdf, makeStatementPdf } from '../../../tests/helpers/pdf-fixtures'

const silent = { log: createSilentLogger() }

describe('parseStatement', () => {
  it('parses a full statement with metadata-anchored validation', async () => {
    const pdf = await makeStatementPdf([
      {
        titleLines: [
          'HDFC BANK Statement of Account',
          'A/C No : 50100123456789   IFSC : HDFC0001234',
          'Statement Period : 01/04/2026 To 30/04/2026',
          'Opening Balance : 45,230.50',
          'Closing Balance : 1,16,000.00',
        ],
        withHeader: true,
        rows: [
          { date: '01/04/2026', desc: 'UPI/DR/510298/PhonePe', ref: 'UTR510298', debit: '1,500.00', balance: '43,730.50' },
          { date: '02/04/2026', desc: 'NEFT-SALARY-CREDIT', credit: '85,000.00', balance: '1,28,730.50' },
          { date: '03/04/2026', desc: 'ATM-CASH-WDL-MUMBAI', debit: '10,000.00', balance: '1,18,730.50' },
          { date: '04/04/2026', desc: 'POS-AMAZON-PAY-INDIA', debit: '2,730.50', balance: '1,16,000.00' },
        ],
        withFooter: true,
      },
    ])

    const result = await parseStatement(pdf, silent)

    expect(result.transactions).toHaveLength(4)
    expect(result.bank.bankId).toBe('hdfc')
    expect(result.meta).toMatchObject({
      bankId: 'hdfc',
      bankName: 'HDFC Bank',
      accountNumber: '50100123456789',
      ifsc: 'HDFC0001234',
      periodFrom: '2026-04-01',
      periodTo: '2026-04-30',
      openingBalance: 45230.5,
      closingBalance: 116000,
    })
    // With opening AND closing anchored, every link including the ends is
    // checkable — the strongest possible pass.
    expect(result.validation.reconciliation.checkableLinks).toBe(5)
    expect(result.validation.reconciliation.fraction).toBe(1)
    expect(result.validation.verdict).toBe('pass')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.parserVersion).toBe(PARSER_VERSION)
    expect(Object.keys(result.stageTimings)).toEqual([
      'pdf-extraction',
      'classification',
      'metadata',
      'bank-detection',
      'table-detection',
      'header-mapping',
      'row-parsing',
      'validation',
    ])
    expect(result.totalMs).toBeLessThan(3000)
  })

  it('adapts canonical output to the legacy exporter shapes', async () => {
    const pdf = await makeStatementPdf([
      {
        titleLines: ['HDFC BANK'],
        withHeader: true,
        rows: [{ date: '01/04/2026', desc: 'UPI TEST', ref: 'UTR1', debit: '100.00', balance: '900.00' }],
      },
    ])
    const result = await parseStatement(pdf, silent)
    const legacyTx = toLegacyTransactions(result.transactions)
    expect(legacyTx[0]).toEqual({
      date: '2026-04-01',
      description: 'UPI TEST',
      debit: 100,
      credit: null,
      balance: 900,
      ref_no: 'UTR1',
    })
    const legacyMeta = toLegacyMeta(result.meta)
    expect(legacyMeta.bank_name).toBe('HDFC Bank')
    expect(legacyMeta.total_pages).toBe(1)
  })

  it('throws OCR_UNAVAILABLE for scanned documents', async () => {
    const pdf = await makeScannedLikePdf(2)
    await expect(parseStatement(pdf, silent)).rejects.toMatchObject({
      name: 'ParserError',
      code: 'OCR_UNAVAILABLE',
      stage: 'classification',
    })
  })

  it('throws NO_TABLE_FOUND for non-statement documents', async () => {
    const pdf = await makeDigitalPdf([
      ['HDFC BANK LIMITED', 'Dear customer, your address change request has been processed.', 'Thank you for banking with us.'],
    ])
    await expect(parseStatement(pdf, silent)).rejects.toMatchObject({
      name: 'ParserError',
      code: 'NO_TABLE_FOUND',
    })
  })

  it('throws INVALID_PDF for garbage input', async () => {
    await expect(parseStatement(Buffer.from('not a pdf at all'), silent)).rejects.toMatchObject({
      name: 'ParserError',
      code: 'INVALID_PDF',
    })
  })

  it('surfaces ParserError.isParserError for typed handling at the API layer', async () => {
    try {
      await parseStatement(Buffer.from('junk'), silent)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(ParserError.isParserError(err)).toBe(true)
    }
  })
})
