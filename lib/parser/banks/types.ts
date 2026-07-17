/**
 * lib/parser/banks/types.ts — the bank rule module contract.
 *
 * Rules are DECLARATIVE DATA, not code: detection signals plus optional
 * overrides the generic stages consult. Adding a bank means adding one file
 * that exports a BankRules object and registering it — no generic-stage
 * edits (open/closed principle). Functional hooks can be added to this
 * interface later if a real bank's format genuinely needs custom logic;
 * until one does, data keeps every module deterministic and testable.
 */
import type { CanonicalField } from '../table/types'

export interface BankRules {
  /** Stable identifier, e.g. "hdfc". */
  bankId: string
  /** Display name, e.g. "HDFC Bank". */
  bankName: string

  // ── Detection signals ──────────────────────────────────────────────────
  /** Patterns matched against page text (headers/letterhead/footers). */
  namePatterns: ReadonlyArray<RegExp>
  /** IFSC bank codes (first 4 letters), e.g. ["HDFC"]. */
  ifscPrefixes: ReadonlyArray<string>

  // ── Optional parsing overrides ─────────────────────────────────────────
  /**
   * Header-text → field overrides applied before the generic lexicon
   * resolution. Keys are normalized header text (lowercase, punctuation
   * stripped, whitespace collapsed — see table/header-lexicon.ts).
   */
  headerOverrides?: Readonly<Record<string, CanonicalField>>
  /**
   * Additional junk-row patterns (matched against a row's joined text)
   * beyond the generic set in rows/parse-row.ts.
   */
  junkRowPatterns?: ReadonlyArray<RegExp>
}

/** Result of the bank detection stage. */
export interface BankDetectionResult {
  /** Matched bank id, or null when no registered bank matched. */
  bankId: string | null
  bankName: string | null
  /** The matched rules object, for downstream stages to consult. */
  rules: BankRules | null
  /** How the match was made — affects detection confidence. */
  matchedBy: 'name+ifsc' | 'name' | 'ifsc' | 'none'
}
