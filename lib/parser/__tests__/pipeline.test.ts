/**
 * Capstone integration test: the ENTIRE deterministic pipeline, end to end,
 * on a realistic multi-page synthetic HDFC-style statement —
 *
 *   PDF → extraction → classification → bank detection → table detection
 *       → header mapping → row parsing → validation
 *
 * The fixture's numbers form a correct running-balance chain, so the final
 * assertion is the strongest the engine offers: validation verdict 'pass'
 * with a fully reconciled chain. No network, no AI, no binary fixtures.
 */
import { describe, it, expect } from 'vitest'
import { PdfTextExtractionStage } from '../pdf/extract-text'
import { DocumentClassificationStage } from '../classify/classify'
import { BankDetectionStage } from '../banks/detect-bank'
import { TableDetectionStage } from '../table/detect'
import { HeaderMappingStage } from '../map/header-map'
import { RowParsingStage } from '../rows/parse-row'
import { ValidationStage } from '../validate/validate'
import { runStage } from '../core/stage'
import { createSilentLogger } from '../core/logger'
import { PARSER_VERSION } from '../core/version'
import type { ParseContext, StatementMetadata } from '../core/types'
import { makeStatementPdf } from '../../../tests/helpers/pdf-fixtures'

function ctx(): ParseContext {
  return { docId: 'e2e', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

function emptyMeta(overrides: Partial<StatementMetadata> = {}): StatementMetadata {
  return {
    bankId: null, bankName: null, accountNumber: null, accountHolder: null, ifsc: null,
    periodFrom: null, periodTo: null, openingBalance: null, closingBalance: null,
    currency: 'INR', totalPages: 2,
    ...overrides,
  }
}

describe('full pipeline (E2E, offline)', () => {
  it('parses a 2-page HDFC-style statement to a validated pass', async () => {
    // Balances chain correctly by construction:
    // 43,730.50 → +85,000 → 1,28,730.50 → −10,000 → 1,18,730.50 → −2,730.50 → 1,16,000.00
    const pdf = await makeStatementPdf([
      {
        titleLines: ['HDFC BANK Statement of Account', 'A/C 50100123456789  IFSC HDFC0001234'],
        withHeader: true,
        rows: [
          { date: '01/04/2026', desc: 'UPI/DR/510298/PhonePe', descContinuations: ['GROCERY MART PVT LTD'], ref: 'UTR510298', debit: '1,500.00', balance: '43,730.50' },
          { date: '02/04/2026', desc: 'NEFT-SALARY-CREDIT', credit: '85,000.00', balance: '1,28,730.50' },
          { date: '03/04/2026', desc: 'ATM-CASH-WDL-MUMBAI', debit: '10,000.00', balance: '1,18,730.50' },
        ],
      },
      {
        withHeader: false, // continuation page inherits column geometry
        rows: [
          { date: '04/04/2026', desc: 'POS-AMAZON-PAY-INDIA', debit: '2,730.50', balance: '1,16,000.00' },
        ],
        withFooter: true,
      },
    ])

    const c = ctx()
    const t0 = Date.now()

    const extracted = await runStage(new PdfTextExtractionStage(), pdf, c)
    const classified = await runStage(new DocumentClassificationStage(), extracted.data, c)
    const bank = await runStage(new BankDetectionStage(), extracted.data, c)
    const detected = await runStage(new TableDetectionStage(), extracted.data, c)
    const mapping = await runStage(
      new HeaderMappingStage(),
      { detection: detected.data, bank: bank.data.rules },
      c
    )
    const parsed = await runStage(new RowParsingStage(), { mapped: mapping.data, bank: bank.data.rules }, c)
    const validated = await runStage(
      new ValidationStage(),
      {
        transactions: parsed.data.transactions,
        meta: emptyMeta({ bankId: bank.data.bankId, bankName: bank.data.bankName }),
      },
      c
    )
    const elapsed = Date.now() - t0

    // Classification and bank detection
    expect(classified.data.kind).toBe('digital')
    expect(bank.data.bankId).toBe('hdfc')
    expect(bank.data.matchedBy).toBe('name+ifsc')

    // Structure: 2 tables (page 2 inherited), 4 transactions
    expect(detected.data.tables).toHaveLength(2)
    expect(detected.data.tables[1].inheritedHeader).toBe(true)
    const txs = parsed.data.transactions
    expect(txs).toHaveLength(4)

    // Content: multiline description merged, amounts and dates canonical
    expect(txs[0]).toMatchObject({
      date: '2026-04-01',
      description: 'UPI/DR/510298/PhonePe GROCERY MART PVT LTD',
      reference: 'UTR510298',
      debit: 1500,
      credit: null,
      balance: 43730.5,
      page: 1,
    })
    expect(txs[3]).toMatchObject({ date: '2026-04-04', debit: 2730.5, balance: 116000, page: 2 })

    // The verdict: fully reconciled chain, no issues, pass.
    expect(validated.data.reconciliation.fraction).toBe(1)
    expect(validated.data.reconciliation.direction).toBe('forward')
    expect(validated.data.issues).toHaveLength(0)
    expect(validated.data.verdict).toBe('pass')
    expect(validated.confidence).toBeGreaterThan(0.9)

    // Performance goal from the spec: well under 3s for a normal statement.
    expect(elapsed).toBeLessThan(3000)
  })

  it('detects a deliberately corrupted statement via the validator', async () => {
    const pdf = await makeStatementPdf([
      {
        titleLines: ['HDFC BANK Statement of Account'],
        withHeader: true,
        rows: [
          { date: '01/04/2026', desc: 'ROW ONE', debit: '100.00', balance: '900.00' },
          // Wrong balance: 900 − 200 should be 700, prints 650.
          { date: '02/04/2026', desc: 'ROW TWO', debit: '200.00', balance: '650.00' },
          { date: '03/04/2026', desc: 'ROW THREE', debit: '50.00', balance: '600.00' },
        ],
      },
    ])

    const c = ctx()
    const extracted = await runStage(new PdfTextExtractionStage(), pdf, c)
    const bank = await runStage(new BankDetectionStage(), extracted.data, c)
    const detected = await runStage(new TableDetectionStage(), extracted.data, c)
    const mapping = await runStage(new HeaderMappingStage(), { detection: detected.data, bank: bank.data.rules }, c)
    const parsed = await runStage(new RowParsingStage(), { mapped: mapping.data, bank: bank.data.rules }, c)
    const validated = await runStage(
      new ValidationStage(),
      { transactions: parsed.data.transactions, meta: emptyMeta() },
      c
    )

    expect(validated.data.verdict).toBe('warn')
    expect(validated.data.reconciliation.breaks).toHaveLength(1)
    expect(validated.data.issues.some(i => i.code === 'BALANCE_BREAK')).toBe(true)
  })
})
