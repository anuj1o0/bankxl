/**
 * lib/parser/core/dates.ts — ISO calendar-date utilities shared by row
 * parsing (which produces ISO dates) and validation (which verifies them).
 */

/** Strict ISO calendar-date check (YYYY-MM-DD and actually a real date). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/**
 * Builds a zero-padded ISO date string when the parts form a real calendar
 * date, else null.
 *
 * @param year - Full 4-digit year.
 * @param month - 1-based month.
 * @param day - Day of month.
 */
export function toIsoDate(year: number, month: number, day: number): string | null {
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isValidIsoDate(iso) ? iso : null
}
