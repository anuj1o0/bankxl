import { describe, it, expect } from 'vitest'
import { ValidationStage } from '../validate'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext, ParsedTransaction, StatementMetadata } from '../../core/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

function tx(
  debit: number | null,
  credit: number | null,
  balance: number | null,
  overrides: Partial<ParsedTransaction> = {}
): ParsedTransaction {
  return {
    date: '2026-04-01',
    description: 'ROW',
    reference: null,
    debit,
    credit,
    balance,
    page: 1,
    confidence: 1,
    ...overrides,
  }
}

function meta(overrides: Partial<StatementMetadata> = {}): StatementMetadata {
  return {
    bankId: 'hdfc',
    bankName: 'HDFC Bank',
    accountNumber: null,
    accountHolder: null,
    ifsc: null,
    periodFrom: null,
    periodTo: null,
    openingBalance: null,
    closingBalance: null,
    currency: 'INR',
    totalPages: 1,
    ...overrides,
  }
}

const stage = new ValidationStage()

describe('ValidationStage', () => {
  it('passes a fully reconciled clean statement with high confidence', async () => {
    const result = await runStage(
      stage,
      {
        transactions: [
          tx(1500, null, 43730.5),
          tx(null, 85000, 128730.5, { date: '2026-04-02', description: 'SALARY' }),
          tx(10000, null, 118730.5, { date: '2026-04-03', description: 'ATM' }),
        ],
        meta: meta({ openingBalance: 45230.5, closingBalance: 118730.5 }),
      },
      ctx()
    )
    expect(result.data.verdict).toBe('pass')
    expect(result.data.reconciliation.fraction).toBe(1)
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.warnings).toHaveLength(0)
  })

  it('fails a statement whose chain is badly broken (missing rows)', async () => {
    // Every link breaks: printed balances never match the computed chain.
    const result = await runStage(
      stage,
      {
        transactions: [tx(100, null, 900), tx(100, null, 500), tx(100, null, 100), tx(100, null, 950)],
        meta: meta({ openingBalance: 1000 }),
      },
      ctx()
    )
    expect(result.data.verdict).toBe('fail')
    expect(result.data.reconciliation.fraction).toBeLessThan(0.8)
    expect(result.data.issues.some(i => i.code === 'BALANCE_BREAK')).toBe(true)
  })

  it('warns (not fails) when reconciliation is impossible', async () => {
    const result = await runStage(
      stage,
      { transactions: [tx(100, null, null), tx(null, 50, null)], meta: meta() },
      ctx()
    )
    expect(result.data.verdict).toBe('warn')
    expect(result.data.issues.some(i => i.code === 'RECONCILIATION_IMPOSSIBLE')).toBe(true)
  })

  it('fails when structural errors exceed the threshold', async () => {
    // 2 of 3 rows have both debit and credit set (66% > 10%).
    const result = await runStage(
      stage,
      {
        transactions: [tx(100, 50, 900), tx(100, 25, 800), tx(100, null, 700)],
        meta: meta(),
      },
      ctx()
    )
    expect(result.data.verdict).toBe('fail')
    expect(result.data.structuralErrorCount).toBe(2)
    // Errors surface as stage warnings for uniform logging
    expect(result.warnings.some(w => w.code === 'BOTH_DEBIT_AND_CREDIT')).toBe(true)
  })

  it('fails an empty statement', async () => {
    const result = await runStage(stage, { transactions: [], meta: meta() }, ctx())
    expect(result.data.verdict).toBe('fail')
    expect(result.confidence).toBe(0)
  })

  it('warns on a single balance break but keeps the statement usable', async () => {
    const result = await runStage(
      stage,
      {
        transactions: [
          tx(100, null, 900),
          tx(200, null, 999), // break
          tx(null, 50, 1049),
          tx(100, null, 949),
          tx(100, null, 849),
        ],
        meta: meta({ openingBalance: 1000 }),
      },
      ctx()
    )
    expect(result.data.verdict).toBe('warn')
    expect(result.data.reconciliation.breaks).toHaveLength(1)
    expect(result.data.issues.filter(i => i.code === 'BALANCE_BREAK')).toHaveLength(1)
  })

  it('reports duplicates and out-of-period dates as warnings in the report', async () => {
    const result = await runStage(
      stage,
      {
        transactions: [
          tx(150, null, 850, { description: 'UPI/DR/1' }),
          tx(150, null, 700, { description: 'UPI/DR/1', date: '2026-04-01' }),
          tx(100, null, 600, { date: '2026-07-20' }),
        ],
        meta: meta({ openingBalance: 1000, periodFrom: '2026-04-01', periodTo: '2026-04-30' }),
      },
      ctx()
    )
    const codes = result.data.issues.map(i => i.code)
    // Rows 0 and 1 share date+amount+description (balance is ignored by the
    // duplicate key — printed balances always differ between real rows).
    expect(codes).toContain('POSSIBLE_DUPLICATE')
    expect(codes).toContain('DATE_OUTSIDE_PERIOD')
    expect(result.data.verdict).toBe('warn')
  })
})
