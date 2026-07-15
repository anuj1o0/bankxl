import { describe, it, expect } from 'vitest'
import { looksLikeDate, looksLikeAmount } from '../patterns'

describe('looksLikeDate', () => {
  it.each([
    '01/04/2026',
    '1-4-26',
    '01.04.2026',
    '2026-04-01',
    '01 Apr 2026',
    '01-Apr-26',
    'Apr 01, 2026',
  ])('accepts %s', s => {
    expect(looksLikeDate(s)).toBe(true)
  })

  it.each(['hello world', '123456', 'UPI/DR/1234', '', '01/04', 'Total: 4,500.00'])('rejects %s', s => {
    expect(looksLikeDate(s)).toBe(false)
  })
})

describe('looksLikeAmount', () => {
  it.each([
    '1,23,456.78', // Indian grouping
    '123,456.78', // western grouping
    '1234.56',
    '₹ 1,234.00',
    'Rs. 500',
    'INR 2,000.00',
    '450.50 Cr',
    '450.50 Dr',
    '(500.00)', // accounting negative
    '-750.25',
  ])('accepts %s', s => {
    expect(looksLikeAmount(s)).toBe(true)
  })

  it.each([
    'UPI-1234',
    'hello',
    '',
    '9876543210', // long bare integer = account/ref number
    '01/04/2026',
    '12.34.56',
  ])('rejects %s', s => {
    expect(looksLikeAmount(s)).toBe(false)
  })

  it('accepts short bare integers (small whole-rupee amounts)', () => {
    expect(looksLikeAmount('500')).toBe(true)
    expect(looksLikeAmount('45000')).toBe(true)
  })
})
