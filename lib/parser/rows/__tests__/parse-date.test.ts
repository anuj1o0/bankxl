import { describe, it, expect } from 'vitest'
import { parseStatementDate } from '../parse-date'

describe('parseStatementDate', () => {
  it.each([
    ['01/04/2026', '2026-04-01'],
    ['1/4/2026', '2026-04-01'],
    ['01-04-26', '2026-04-01'],
    ['01.04.2026', '2026-04-01'],
    ['2026-04-01', '2026-04-01'],
    ['2026/04/01', '2026-04-01'],
    ['01 Apr 2026', '2026-04-01'],
    ['01-Apr-26', '2026-04-01'],
    ['01 September 2026', '2026-09-01'],
    ['Apr 01, 2026', '2026-04-01'],
    ['Apr 01 2026', '2026-04-01'],
  ])('parses %s → %s', (raw, iso) => {
    expect(parseStatementDate(raw)).toBe(iso)
  })

  it('pivots two-digit years at 70', () => {
    expect(parseStatementDate('01/04/26')).toBe('2026-04-01')
    expect(parseStatementDate('01/04/98')).toBe('1998-04-01')
  })

  it('is strictly day-first: rejects month>12 instead of US-swapping', () => {
    expect(parseStatementDate('04/13/2026')).toBeNull()
  })

  it('rejects impossible calendar dates', () => {
    expect(parseStatementDate('30/02/2026')).toBeNull()
    expect(parseStatementDate('32/01/2026')).toBeNull()
  })

  it.each(['', 'hello', '1,500.00', 'UTR510298', '01/04', '2026'])('rejects %s', raw => {
    expect(parseStatementDate(raw)).toBeNull()
  })
})
