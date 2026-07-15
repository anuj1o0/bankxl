/**
 * lib/parser/rows/parse-date.ts — deterministic statement-date parsing.
 *
 * Converts printed date shapes into ISO YYYY-MM-DD. DAY-FIRST by policy:
 * Indian statements print DD/MM/YYYY; a value whose "month" exceeds 12 is
 * rejected rather than US-swapped — a deterministic parser must never
 * guess. Two-digit years pivot at 70 (26 → 2026, 98 → 1998).
 */
import { toIsoDate } from '../core/dates'

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
}

const TWO_DIGIT_PIVOT = 70

function fullYear(y: number): number {
  if (y >= 100) return y
  return y < TWO_DIGIT_PIVOT ? 2000 + y : 1900 + y
}

function monthFromName(name: string): number | null {
  return MONTHS[name.toLowerCase()] ?? null
}

/**
 * Parses a printed statement date into ISO YYYY-MM-DD.
 *
 * Supported shapes: DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY, YYYY-MM-DD,
 * DD MMM YYYY, DD-Mon-YY, MMM DD, YYYY.
 *
 * @param raw - The printed date text.
 * @returns ISO date string, or null when the text isn't a real calendar
 *   date in any supported shape.
 */
export function parseStatementDate(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 5 || t.length > 20) return null

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t)
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t)
  if (m) return toIsoDate(fullYear(Number(m[3])), Number(m[2]), Number(m[1]))

  m = /^(\d{1,2})[-\s./]([A-Za-z]{3,9})[-\s./](\d{2,4})$/.exec(t)
  if (m) {
    const month = monthFromName(m[2])
    return month ? toIsoDate(fullYear(Number(m[3])), month, Number(m[1])) : null
  }

  m = /^([A-Za-z]{3,9})[-\s./](\d{1,2}),?\s*(\d{2,4})$/.exec(t)
  if (m) {
    const month = monthFromName(m[1])
    return month ? toIsoDate(fullYear(Number(m[3])), month, Number(m[2])) : null
  }

  return null
}
