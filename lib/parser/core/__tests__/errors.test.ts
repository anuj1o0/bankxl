import { describe, it, expect } from 'vitest'
import { ParserError } from '../errors'

describe('ParserError', () => {
  it('carries code, stage, and details', () => {
    const err = new ParserError('NO_TABLE_FOUND', 'no table on any page', 'table-detection', { pages: 4 })
    expect(err.code).toBe('NO_TABLE_FOUND')
    expect(err.stage).toBe('table-detection')
    expect(err.details).toEqual({ pages: 4 })
    expect(err.message).toBe('no table on any page')
    expect(err.name).toBe('ParserError')
  })

  it('serializes to the structured shape', () => {
    const err = new ParserError('ENCRYPTED_PDF', 'password protected', 'pdf-extraction', { size: 1024 })
    expect(err.toShape()).toEqual({
      code: 'ENCRYPTED_PDF',
      message: 'password protected',
      stage: 'pdf-extraction',
      details: { size: 1024 },
    })
  })

  it('defaults details to an empty object', () => {
    const err = new ParserError('INTERNAL', 'boom', 'validation')
    expect(err.details).toEqual({})
  })

  it('preserves the causing error', () => {
    const cause = new TypeError('bad input')
    const err = new ParserError('INTERNAL', 'wrapped', 'row-parsing', {}, { cause })
    expect(err.cause).toBe(cause)
  })

  it('type guard accepts ParserError and rejects others', () => {
    expect(ParserError.isParserError(new ParserError('INTERNAL', 'x', 'ocr'))).toBe(true)
    expect(ParserError.isParserError(new Error('plain'))).toBe(false)
    expect(ParserError.isParserError(null)).toBe(false)
    expect(ParserError.isParserError('string')).toBe(false)
  })
})
