/**
 * lib/parser/rows/parse-date.ts — deterministic statement-date parsing.
 *
 * Converts printed date shapes into ISO YYYY-MM-DD. Supports both DD/MM
 * (Indian/European) and MM/DD (US) via document-level format inference.
 * Two-digit years pivot at 70 (26 → 2026, 98 → 1998).
 */
import { toIsoDate } from '../core/dates'
import type { DateFieldOrder } from '../core/types'

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

function tryParse(t: string, order: DateFieldOrder = 'dmy'): string | null {
  if (t.length < 5 || t.length > 20) return null

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t)
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t)
  if (m) {
    const a = Number(m[1]), b = Number(m[2]), yr = fullYear(Number(m[3]))
    if (order === 'mdy') return toIsoDate(yr, a, b)
    return toIsoDate(yr, b, a)
  }

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

export function parseStatementDate(raw: string, order: DateFieldOrder = 'dmy'): string | null {
  const t = raw.trim()
  const exact = tryParse(t, order)
  if (exact) return exact

  if (t.length > 25) return null
  const collapsed = t.replace(/\s*([/.-])\s*/g, '$1')
  const parts = collapsed.split(/\s+/)
  for (let i = 0; i < parts.length; i++) {
    const single = tryParse(parts[i], order)
    if (single) return single
    if (i + 1 < parts.length) {
      const pair = tryParse(`${parts[i]}${parts[i + 1]}`, order)
      if (pair) return pair
    }
  }
  return null
}

/**
 * Scans date-shaped strings across the document to infer DD/MM vs MM/DD.
 * If any numeric date has a slot-1 value > 12, the format is mathematically
 * proven (that value MUST be a day, not a month).
 */
export function inferDateFormat(texts: ReadonlyArray<string>): DateFieldOrder {
  const NUMERIC_DATE = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/
  let slot1Over12 = 0
  let slot2Over12 = 0
  let samples = 0
  for (const raw of texts) {
    const m = NUMERIC_DATE.exec(raw.trim())
    if (!m) continue
    const a = Number(m[1]), b = Number(m[2])
    if (a > 31 || b > 31) continue
    samples++
    if (a > 12) slot1Over12++
    if (b > 12) slot2Over12++
  }
  if (slot1Over12 > 0 && slot2Over12 === 0) return 'mdy'
  if (slot2Over12 > 0 && slot1Over12 === 0) return 'dmy'
  return 'dmy'
}
