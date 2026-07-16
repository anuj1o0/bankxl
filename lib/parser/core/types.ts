/**
 * lib/parser/core/types.ts — canonical data model and stage contracts for the
 * BankXL document intelligence engine.
 *
 * Every pipeline stage consumes and produces these types; nothing here may
 * depend on any other parser module (this file is the dependency root).
 *
 * Money convention: amounts are rupee `number`s with two decimal places, the
 * convention shared by the existing normalize/export layers (lib/normalize.ts,
 * lib/excel.ts, lib/formats.ts) that this engine reuses. Comparisons must use
 * the ±0.01 tolerance helpers (see validator stage) — never `===` on amounts.
 * Date convention: ISO `YYYY-MM-DD` strings.
 */

/** A single extracted transaction row in canonical form. */
export interface ParsedTransaction {
  /** Transaction date, ISO YYYY-MM-DD. */
  date: string
  /** Full description/narration, multiline fragments already merged. */
  description: string
  /** UPI ref / UTR / cheque number / instrument ref, when printed. */
  reference: string | null
  /** Amount withdrawn, rupees. Exactly one of debit/credit is non-null. */
  debit: number | null
  /** Amount deposited, rupees. Exactly one of debit/credit is non-null. */
  credit: number | null
  /** Running balance after this transaction, when the statement prints one. */
  balance: number | null
  /** 1-based page number the row was extracted from. */
  page: number
  /** Extraction confidence for this row, 0..1. */
  confidence: number
}

/** Statement-level metadata assembled across stages. */
export interface StatementMetadata {
  /** Stable bank identifier, e.g. "hdfc" — null until bank detection runs. */
  bankId: string | null
  /** Human-readable bank name, e.g. "HDFC Bank". */
  bankName: string | null
  accountNumber: string | null
  accountHolder: string | null
  ifsc: string | null
  /** Statement period start, ISO YYYY-MM-DD. */
  periodFrom: string | null
  /** Statement period end, ISO YYYY-MM-DD. */
  periodTo: string | null
  openingBalance: number | null
  closingBalance: number | null
  /** ISO 4217 code; Indian statements default to "INR". */
  currency: string
  totalPages: number
}

/** Identifiers for each pipeline stage, used in logs and structured errors. */
export type StageName =
  | 'pdf-extraction'
  | 'ocr'
  | 'classification'
  | 'bank-detection'
  | 'table-detection'
  | 'header-mapping'
  | 'row-parsing'
  | 'validation'
  | 'export'

/** A non-fatal issue observed during a stage; surfaces in logs and audit. */
export interface StageWarning {
  /** Machine-readable warning code, e.g. "ROW_MISSING_BALANCE". */
  code: string
  /** Human-readable explanation. */
  message: string
  /** 1-based page number, when the warning is page-specific. */
  page?: number
}

/**
 * Uniform envelope every stage returns. Confidence and warnings are part of
 * the type so no stage can silently skip the audit contract.
 */
export interface StageResult<T> {
  data: T
  /** Stage-level confidence in its own output, 0..1. */
  confidence: number
  warnings: StageWarning[]
  /** Wall-clock execution time, filled in by runStage(). */
  durationMs: number
  stage: StageName
}

/** Logger contract — see logger.ts for the console implementation. */
export interface StageLogger {
  info(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void
  warn(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void
  error(event: string, fields?: Readonly<Record<string, string | number | boolean | null>>): void
}

/**
 * Per-document context threaded through every stage: correlation id for
 * logs/audit, the engine version that produced the result, and the logger.
 */
export type DateFieldOrder = 'dmy' | 'mdy'

export interface ParseContext {
  /** Correlation id — the conversions-table row id, or a synthetic id in tests. */
  docId: string
  parserVersion: string
  log: StageLogger
  /** Date.now() at pipeline start; stages may use it for budget decisions. */
  startedAt: number
  /** Inferred date field order for the document (DD/MM vs MM/DD). */
  dateFormat?: DateFieldOrder
}

/**
 * A pipeline stage: one job, typed input, typed output, replaceable
 * implementation. Stages are executed via runStage() (stage.ts), which owns
 * timing, logging, and error normalization.
 */
export interface PipelineStage<TIn, TOut> {
  readonly name: StageName
  execute(input: TIn, ctx: ParseContext): Promise<Omit<StageResult<TOut>, 'durationMs' | 'stage'>>
}
