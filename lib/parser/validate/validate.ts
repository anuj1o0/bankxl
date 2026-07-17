/**
 * lib/parser/validate/validate.ts — the validation stage.
 *
 * Composes reconciliation and structural checks into a ValidationReport
 * with a verdict. This stage only throws on internal bugs — a document that
 * fails validation still RETURNS (verdict 'fail'), because deciding what a
 * failure means (reject, retry, route elsewhere) is orchestrator policy.
 *
 * Verdict policy:
 *  - fail: no transactions; or reconciliation < FAIL_FRACTION with at least
 *    MIN_LINKS_FOR_FAIL checkable links; or structural errors on more than
 *    STRUCTURAL_FAIL_RATE of rows.
 *  - pass: full reconciliation and zero issues of ANY severity — 'pass'
 *    means "ship it with no caveats"; anything worth telling the user
 *    about (a duplicate, an out-of-period date) downgrades to 'warn'.
 *  - warn: everything in between (including "nothing was checkable").
 */
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import { reconcileBalances } from './reconcile'
import { checkAmounts, checkDates, checkDuplicates } from './checks'
import type { ValidationInput, ValidationIssue, ValidationReport, ValidationVerdict } from './types'

const FAIL_FRACTION = 0.8
const MIN_LINKS_FOR_FAIL = 3
const STRUCTURAL_FAIL_RATE = 0.1

function decideVerdict(report: Omit<ValidationReport, 'verdict'>): ValidationVerdict {
  if (report.transactionCount === 0) return 'fail'
  const { reconciliation } = report
  if (
    !reconciliation.impossible &&
    reconciliation.checkableLinks >= MIN_LINKS_FOR_FAIL &&
    reconciliation.fraction < FAIL_FRACTION
  ) {
    return 'fail'
  }
  if (report.structuralErrorCount / report.transactionCount > STRUCTURAL_FAIL_RATE) {
    return 'fail'
  }
  if (report.issues.length === 0 && !reconciliation.impossible && reconciliation.fraction === 1) {
    return 'pass'
  }
  return 'warn'
}

/** Weighted confidence: reconciliation dominates, structure and dates temper it. */
function computeConfidence(report: Omit<ValidationReport, 'verdict'>): number {
  if (report.transactionCount === 0) return 0
  const recon = report.reconciliation.impossible ? 0.5 : report.reconciliation.fraction
  const structural = 1 - Math.min(1, report.structuralErrorCount / report.transactionCount)
  const warningCount = report.issues.filter(i => i.severity === 'warning').length
  const warnings = 1 - Math.min(1, warningCount / Math.max(report.transactionCount, 1))
  return Math.max(0, Math.min(1, 0.6 * recon + 0.25 * structural + 0.15 * warnings))
}

/** Validation stage: { transactions, meta } → ValidationReport. */
export class ValidationStage implements PipelineStage<ValidationInput, ValidationReport> {
  readonly name = 'validation' as const

  async execute(
    input: ValidationInput,
    ctx: ParseContext
  ): Promise<Omit<StageResult<ValidationReport>, 'durationMs' | 'stage'>> {
    const { transactions, meta } = input

    const reconciliation = reconcileBalances(transactions, meta)
    const issues: ValidationIssue[] = [
      ...checkAmounts(transactions),
      ...checkDates(transactions, meta),
      ...checkDuplicates(transactions),
    ]
    for (const brk of reconciliation.breaks) {
      issues.push({
        code: 'BALANCE_BREAK',
        severity: 'warning',
        message: `chain break at row ${brk.txIndex}: expected ${brk.expected.toFixed(2)}, printed ${brk.actual.toFixed(2)}`,
        txIndex: brk.txIndex,
      })
    }
    if (reconciliation.impossible && transactions.length > 0) {
      issues.push({
        code: 'RECONCILIATION_IMPOSSIBLE',
        severity: 'warning',
        message: 'no printed balances to reconcile against',
      })
    }

    const structuralErrorRows = new Set(
      issues.filter(i => i.severity === 'error' && i.txIndex !== undefined).map(i => i.txIndex as number)
    )
    const partial: Omit<ValidationReport, 'verdict'> = {
      reconciliation,
      issues,
      structuralErrorCount: structuralErrorRows.size,
      transactionCount: transactions.length,
    }
    const verdict = decideVerdict(partial)
    const report: ValidationReport = { ...partial, verdict }

    ctx.log.info('validation_done', {
      verdict,
      transactions: transactions.length,
      reconciled: `${reconciliation.reconciledLinks}/${reconciliation.checkableLinks}`,
      direction: reconciliation.direction,
      breaks: reconciliation.breaks.length,
      errors: report.structuralErrorCount,
    })

    // Errors surface as stage warnings too, so runStage's uniform logging
    // shows them without callers digging into the report.
    const warnings: StageWarning[] = issues
      .filter(i => i.severity === 'error')
      .slice(0, 10)
      .map(i => ({ code: i.code, message: i.message }))

    return { data: report, confidence: computeConfidence(partial), warnings }
  }
}
