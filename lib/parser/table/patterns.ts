/**
 * lib/parser/table/patterns.ts — deterministic text-shape heuristics shared
 * by table detection and row merging.
 *
 * These answer "does this string LOOK like a date/amount", not "parse it" —
 * parsing (with statement-period context for 2-digit years etc.) is the row
 * parser's job, using lib/normalize.ts.
 */

/**
 * Date shapes seen across Indian bank statements:
 *   01/04/2026, 01-04-26, 01.04.2026, 2026-04-01, 01 Apr 2026, 01-Apr-26,
 *   Apr 01, 2026
 */
const DATE_PATTERNS: ReadonlyArray<RegExp> = [
  /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/, // 01/04/2026, 1-4-26
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/, // 2026-04-01
  /^\d{1,2}[-\s./]?[A-Za-z]{3,9}[-\s./]?\d{2,4}$/, // 01 Apr 2026, 01-Apr-26
  /^[A-Za-z]{3,9}[-\s./]?\d{1,2},?[-\s./]?\d{2,4}$/, // Apr 01, 2026
]

/**
 * Whether a string is shaped like a transaction date.
 *
 * @param text - Raw cell text (will be trimmed).
 */
export function looksLikeDate(text: string): boolean {
  const t = text.trim()
  if (t.length < 5 || t.length > 20) return false
  return DATE_PATTERNS.some(re => re.test(t))
}

/**
 * Whether a string is shaped like a money amount: optional currency marker,
 * digits with optional Indian (1,23,456.78) or western (123,456.78) grouping,
 * optional trailing Dr/Cr marker. Rejects bare integers longer than 7 digits
 * (those are account/reference numbers, not amounts).
 *
 * @param text - Raw cell text (will be trimmed).
 */
export function looksLikeAmount(text: string): boolean {
  let t = text.trim()
  if (t.length === 0 || t.length > 24) return false
  t = t
    .replace(/^(rs\.?|inr|₹)\s*/i, '')
    .replace(/\s*\(?(?:dr|cr|od)\)?\.?\s*$/i, '')
    .replace(/^\((.*)\)$/, '$1') // (1,234.56) accounting negative
    .replace(/^-/, '')
    .trim()
  if (!/^[\d,]+(\.\d{1,2})?$/.test(t)) return false
  const digits = t.replace(/[^0-9]/g, '')
  if (digits.length === 0) return false
  // A long unpunctuated integer is an account/ref number, not an amount.
  if (!t.includes('.') && !t.includes(',') && digits.length > 7) return false
  return true
}
