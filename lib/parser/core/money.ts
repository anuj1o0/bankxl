/**
 * lib/parser/core/money.ts — the engine's money-comparison convention.
 *
 * Amounts are rupee `number`s (see core/types.ts). Statements print two
 * decimals, so equality means "within a paisa"; the tolerance lives here,
 * in exactly one place, and nothing in the parser may compare amounts with
 * `===`.
 */

/**
 * Comparison tolerance in rupees. Slightly above 0.01 so a legitimate
 * 1-paisa print difference is equal, while float noise around the boundary
 * (0.005 + 0.005) can't flip a comparison.
 */
export const MONEY_TOLERANCE = 0.011

/**
 * Whether two amounts are equal under the engine's tolerance.
 *
 * @param a - First amount, rupees.
 * @param b - Second amount, rupees.
 */
export function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_TOLERANCE
}

/**
 * Whether a value is a usable monetary amount: a finite number. (Sign and
 * magnitude policy is the caller's business — a balance may be negative in
 * an overdraft, a debit may not.)
 */
export function isUsableAmount(value: number | null): value is number {
  return value !== null && Number.isFinite(value)
}
