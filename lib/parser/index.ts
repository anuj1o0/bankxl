/**
 * lib/parser/index.ts — the pipeline orchestrator and public entry point.
 *
 * parseStatement(buffer) composes every stage in order:
 *
 *   pdf-extraction → classification → metadata → bank-detection
 *     → table-detection → header-mapping → row-parsing → validation
 *
 * and returns transactions + metadata + the validation report + a full
 * audit block (per-stage timings, warnings, confidence, parser version).
 * Hard failures throw typed ParserErrors; a document that parses but
 * validates poorly RETURNS with verdict 'fail' — the caller owns policy.
 *
 * Scanned documents throw OCR_UNAVAILABLE until the OCR stage exists.
 */
import { ParserError } from './core/errors'
import { createConsoleLogger } from './core/logger'
import { runStage } from './core/stage'
import { PARSER_VERSION } from './core/version'
import type { ParseContext, ParsedTransaction, StageWarning, StatementMetadata } from './core/types'
import { PdfTextExtractionStage } from './pdf/extract-text'
import { DocumentClassificationStage } from './classify/classify'
import { MetadataExtractionStage } from './meta/extract-meta'
import { BankDetectionStage } from './banks/detect-bank'
import { TableDetectionStage } from './table/detect'
import { HeaderMappingStage } from './map/header-map'
import { RowParsingStage } from './rows/parse-row'
import { ValidationStage } from './validate/validate'
import type { ValidationReport } from './validate/types'
import type { BankDetectionResult } from './banks/types'

export { PARSER_VERSION } from './core/version'
export { ParserError } from './core/errors'
export { toLegacyTransactions, toLegacyMeta } from './adapt'

export interface ParseStatementResult {
  transactions: ParsedTransaction[]
  meta: StatementMetadata
  validation: ValidationReport
  bank: BankDetectionResult
  /** Overall confidence: the weakest load-bearing stage bounds the result. */
  confidence: number
  parserVersion: string
  totalMs: number
  stageTimings: Record<string, number>
  warnings: StageWarning[]
}

export interface ParseStatementOptions {
  /** Correlation id for logs/audit (conversions row id). Default: random. */
  docId?: string
  /** Injectable logger for tests; default logs JSON lines to console. */
  log?: ParseContext['log']
}

/**
 * Parses a bank statement PDF into validated canonical transactions.
 *
 * @param pdfBuffer - The PDF file.
 * @param options - Correlation id and logger overrides.
 * @returns Transactions, metadata, validation report, and audit data.
 * @throws {ParserError} ENCRYPTED_PDF / INVALID_PDF / OCR_UNAVAILABLE /
 *   NO_TABLE_FOUND / HEADERS_UNRECOGNIZED / INTERNAL.
 */
export async function parseStatement(
  pdfBuffer: Buffer,
  options: ParseStatementOptions = {}
): Promise<ParseStatementResult> {
  const docId = options.docId ?? `doc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const ctx: ParseContext = {
    docId,
    parserVersion: PARSER_VERSION,
    log: options.log ?? createConsoleLogger(docId, PARSER_VERSION),
    startedAt: Date.now(),
  }
  const stageTimings: Record<string, number> = {}
  const warnings: StageWarning[] = []

  const extracted = await runStage(new PdfTextExtractionStage(), pdfBuffer, ctx)
  stageTimings['pdf-extraction'] = extracted.durationMs
  warnings.push(...extracted.warnings)

  const classified = await runStage(new DocumentClassificationStage(), extracted.data, ctx)
  stageTimings['classification'] = classified.durationMs
  warnings.push(...classified.warnings)
  if (classified.data.kind !== 'digital') {
    throw new ParserError(
      'OCR_UNAVAILABLE',
      `Document is ${classified.data.kind} (${classified.data.scannedPageCount} page(s) without a text layer) and no OCR stage exists yet`,
      'classification',
      { kind: classified.data.kind, scannedPages: classified.data.scannedPageCount }
    )
  }

  const metaStage = await runStage(new MetadataExtractionStage(), extracted.data, ctx)
  stageTimings['metadata'] = metaStage.durationMs

  const bank = await runStage(new BankDetectionStage(), extracted.data, ctx)
  stageTimings['bank-detection'] = bank.durationMs
  warnings.push(...bank.warnings)

  const detected = await runStage(new TableDetectionStage(), extracted.data, ctx)
  stageTimings['table-detection'] = detected.durationMs
  warnings.push(...detected.warnings)

  const mapped = await runStage(new HeaderMappingStage(), { detection: detected.data, bank: bank.data.rules }, ctx)
  stageTimings['header-mapping'] = mapped.durationMs
  warnings.push(...mapped.warnings)

  const parsed = await runStage(new RowParsingStage(), { mapped: mapped.data, bank: bank.data.rules }, ctx)
  stageTimings['row-parsing'] = parsed.durationMs
  warnings.push(...parsed.warnings)

  const meta: StatementMetadata = {
    ...metaStage.data,
    bankId: bank.data.bankId,
    bankName: bank.data.bankName,
  }

  const validated = await runStage(new ValidationStage(), { transactions: parsed.data.transactions, meta }, ctx)
  stageTimings['validation'] = validated.durationMs
  warnings.push(...validated.warnings)

  const totalMs = Date.now() - ctx.startedAt
  // The chain is only as strong as its weakest load-bearing stage.
  const confidence = Math.min(
    extracted.confidence,
    detected.confidence,
    mapped.confidence,
    parsed.confidence,
    validated.confidence
  )

  ctx.log.info('parse_complete', {
    transactions: parsed.data.transactions.length,
    verdict: validated.data.verdict,
    bank: bank.data.bankId,
    confidence: Number(confidence.toFixed(3)),
    totalMs,
  })

  return {
    transactions: parsed.data.transactions,
    meta,
    validation: validated.data,
    bank: bank.data,
    confidence,
    parserVersion: PARSER_VERSION,
    totalMs,
    stageTimings,
    warnings,
  }
}
