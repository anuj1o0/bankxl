/**
 * lib/parser/core/errors.ts — structured error type for the parser engine.
 *
 * Every failure crossing a stage boundary is a ParserError carrying
 * { code, message, details, stage } so callers (API routes, workers, tests)
 * can branch on `code` and log `stage` without string-matching messages.
 */
import type { StageName } from './types'

/** Machine-readable failure codes. Extend deliberately; never reuse meanings. */
export type ParserErrorCode =
  /** File is not a readable PDF at all. */
  | 'INVALID_PDF'
  /** PDF is password-protected and cannot be opened. */
  | 'ENCRYPTED_PDF'
  /** Digital-path stage ran on a PDF with no usable text layer. */
  | 'NO_TEXT_LAYER'
  /** Document classified as scanned but no OCR engine is available. */
  | 'OCR_UNAVAILABLE'
  /** Bank could not be identified and no generic rules matched. */
  | 'BANK_UNSUPPORTED'
  /** No transaction table found on any page. */
  | 'NO_TABLE_FOUND'
  /** A table was found but its headers could not be mapped to the schema. */
  | 'HEADERS_UNRECOGNIZED'
  /** Extraction finished but validation rejected the result. */
  | 'VALIDATION_FAILED'
  /** Unexpected internal failure — a bug, not a document problem. */
  | 'INTERNAL'

/** JSON-serializable structured error shape (for API responses and audit). */
export interface ParserErrorShape {
  code: ParserErrorCode
  message: string
  stage: StageName
  details: Readonly<Record<string, string | number | boolean | null>>
}

/**
 * Structured parser failure.
 *
 * `message` must be safe to show a developer; user-facing copy is mapped from
 * `code` at the API layer, never taken from here.
 */
export class ParserError extends Error {
  readonly code: ParserErrorCode
  readonly stage: StageName
  readonly details: Readonly<Record<string, string | number | boolean | null>>

  constructor(
    code: ParserErrorCode,
    message: string,
    stage: StageName,
    details: Readonly<Record<string, string | number | boolean | null>> = {},
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'ParserError'
    this.code = code
    this.stage = stage
    this.details = details
  }

  /** Serializable form for API responses, logs, and audit records. */
  toShape(): ParserErrorShape {
    return { code: this.code, message: this.message, stage: this.stage, details: this.details }
  }

  /** Type guard usable across module boundaries (survives bundling). */
  static isParserError(err: unknown): err is ParserError {
    return err instanceof Error && err.name === 'ParserError' && 'code' in err && 'stage' in err
  }
}
