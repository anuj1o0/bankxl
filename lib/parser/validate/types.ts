/**
 * lib/parser/validate/types.ts — validation report model.
 *
 * The validator MEASURES and REPORTS; it never decides what happens to a
 * failing document (that's the orchestrator's policy). Hence: a rich report
 * with a verdict, not an exception.
 */
import type { ParsedTransaction, StatementMetadata } from '../core/types'

/** Severity of a validation finding. */
export type IssueSeverity = 'error' | 'warning'

/** One validation finding, optionally anchored to a transaction index. */
export interface ValidationIssue {
  /** Machine-readable code, e.g. "BALANCE_BREAK", "BOTH_DEBIT_AND_CREDIT". */
  code: string
  severity: IssueSeverity
  message: string
  /** Index into the validated transactions array, when row-specific. */
  txIndex?: number
}

/** Direction in which the balance chain reconciled best. */
export type ChainDirection = 'forward' | 'reverse' | 'unknown'

/** One point where the printed balance disagreed with the computed chain. */
export interface BalanceBreak {
  /** Index (in the direction-ordered sequence) where the break occurred. */
  txIndex: number
  expected: number
  actual: number
}

/** Outcome of running-balance reconciliation. */
export interface ReconciliationResult {
  /** Balance links that could be checked (printed balance with a prior anchor). */
  checkableLinks: number
  /** Links that reconciled within tolerance. */
  reconciledLinks: number
  /** reconciledLinks / checkableLinks; 1 when nothing was checkable. */
  fraction: number
  direction: ChainDirection
  breaks: BalanceBreak[]
  /** True when no link could be checked (no printed balances / single row). */
  impossible: boolean
  /** Whether the closing balance from metadata matched the chain's end. */
  closingMatched: boolean | null
}

/** Overall verdict. Policy for acting on it belongs to the orchestrator. */
export type ValidationVerdict = 'pass' | 'warn' | 'fail'

/** Input to the validation stage. */
export interface ValidationInput {
  transactions: ParsedTransaction[]
  meta: StatementMetadata
}

/** The stage's full report. */
export interface ValidationReport {
  verdict: ValidationVerdict
  reconciliation: ReconciliationResult
  issues: ValidationIssue[]
  /** Count of rows with structural errors (bad date / bad amount shape). */
  structuralErrorCount: number
  transactionCount: number
}
