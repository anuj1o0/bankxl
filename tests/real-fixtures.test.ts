/**
 * tests/real-fixtures.test.ts — diagnostics against REAL statements.
 *
 * Runs the full engine on whatever PDFs exist in tests/fixtures/local/
 * (gitignored — real statements may contain personal data and are never
 * committed). On machines without fixtures these tests skip, so CI and
 * other checkouts stay green. Output is intentionally verbose: when a
 * statement declines, the printed stage diagnostics are the work item.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { parseStatement, ParserError } from '../lib/parser'
import { createSilentLogger } from '../lib/parser/core/logger'

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'local')
const fixtures = existsSync(FIXTURES_DIR)
  ? readdirSync(FIXTURES_DIR).filter(f => f.toLowerCase().endsWith('.pdf'))
  : []

describe.skipIf(fixtures.length === 0)('real local fixtures', () => {
  it.each(fixtures.map(f => [f]))('%s parses without declining', async file => {
    const buffer = readFileSync(path.join(FIXTURES_DIR, file))
    try {
      const result = await parseStatement(buffer, { log: createSilentLogger() })
      const r = result.validation.reconciliation
      console.log(
        `[fixture] ${file}: ${result.transactions.length} tx, bank=${result.bank.bankId}, ` +
          `verdict=${result.validation.verdict}, reconciled=${r.reconciledLinks}/${r.checkableLinks} (${r.direction}), ` +
          `confidence=${result.confidence.toFixed(2)}, ${result.totalMs}ms`
      )
      for (const issue of result.validation.issues.slice(0, 10)) {
        console.log(`  [issue] ${issue.severity} ${issue.code}: ${issue.message.slice(0, 120)}`)
      }
      for (const w of result.warnings.slice(0, 10)) {
        console.log(`  [warn] ${w.code}: ${w.message.slice(0, 120)}`)
      }
      expect(result.validation.verdict).not.toBe('fail')
    } catch (err) {
      if (ParserError.isParserError(err)) {
        console.log(`[fixture] ${file}: DECLINED ${err.code} @ ${err.stage} — ${err.message.slice(0, 200)}`)
        console.log(`  details: ${JSON.stringify(err.details)}`)
      }
      throw err
    }
  })
})
