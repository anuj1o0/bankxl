import { describe, it, expect } from 'vitest'
import { PdfTextExtractionStage, mapPdfJsLoadError } from '../extract-text'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import {
  makeDigitalPdf,
  makeScannedLikePdf,
  richTextLines,
  FIXTURE_PAGE_WIDTH,
  FIXTURE_PAGE_HEIGHT,
} from '../../../../tests/helpers/pdf-fixtures'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

const stage = new PdfTextExtractionStage()

describe('PdfTextExtractionStage', () => {
  it('extracts all pages with correct dimensions and counts', async () => {
    const pdf = await makeDigitalPdf([richTextLines(), richTextLines(), richTextLines()])
    const result = await runStage(stage, pdf, ctx())
    expect(result.data.totalPages).toBe(3)
    expect(result.data.pages).toHaveLength(3)
    expect(result.confidence).toBe(1)
    expect(result.warnings).toHaveLength(0)
    const page1 = result.data.pages[0]
    expect(page1.pageNumber).toBe(1)
    expect(page1.width).toBeCloseTo(FIXTURE_PAGE_WIDTH, 0)
    expect(page1.height).toBeCloseTo(FIXTURE_PAGE_HEIGHT, 0)
    expect(page1.charCount).toBeGreaterThan(150)
  })

  it('preserves text content of drawn lines', async () => {
    const pdf = await makeDigitalPdf([['HDFC BANK LIMITED', 'Statement of Account']])
    const result = await runStage(stage, pdf, ctx())
    const texts = result.data.pages[0].items.map(i => i.text)
    expect(texts).toContain('HDFC BANK LIMITED')
    expect(texts).toContain('Statement of Account')
  })

  it('normalizes coordinates to top-left origin (top line has smaller y)', async () => {
    // makeDigitalPdf draws lines top-to-bottom, so in top-left-origin space
    // the first line must have the smallest y.
    const pdf = await makeDigitalPdf([['FIRST LINE AT TOP', 'SECOND LINE', 'THIRD LINE AT BOTTOM']])
    const result = await runStage(stage, pdf, ctx())
    const items = result.data.pages[0].items
    const top = items.find(i => i.text.includes('FIRST'))
    const bottom = items.find(i => i.text.includes('THIRD'))
    expect(top).toBeDefined()
    expect(bottom).toBeDefined()
    expect(top!.y).toBeLessThan(bottom!.y)
    // Sanity: both are inside the page
    expect(top!.y).toBeGreaterThan(0)
    expect(bottom!.y).toBeLessThan(FIXTURE_PAGE_HEIGHT)
  })

  it('yields zero items (but succeeds) for pages without a text layer', async () => {
    const pdf = await makeScannedLikePdf(2)
    const result = await runStage(stage, pdf, ctx())
    expect(result.data.totalPages).toBe(2)
    expect(result.data.pages[0].items).toHaveLength(0)
    expect(result.data.pages[0].charCount).toBe(0)
    expect(result.confidence).toBe(1)
  })

  it('rejects garbage bytes with INVALID_PDF', async () => {
    const garbage = Buffer.from('this is definitely not a pdf file at all, just text')
    await expect(runStage(stage, garbage, ctx())).rejects.toMatchObject({
      name: 'ParserError',
      code: 'INVALID_PDF',
      stage: 'pdf-extraction',
    })
  })
})

describe('mapPdfJsLoadError', () => {
  function namedError(name: string, message: string): Error {
    const e = new Error(message)
    e.name = name
    return e
  }

  it('maps PasswordException to ENCRYPTED_PDF', () => {
    const mapped = mapPdfJsLoadError(namedError('PasswordException', 'No password given'))
    expect(mapped.code).toBe('ENCRYPTED_PDF')
    expect(mapped.stage).toBe('pdf-extraction')
  })

  it('maps InvalidPDFException to INVALID_PDF', () => {
    const mapped = mapPdfJsLoadError(namedError('InvalidPDFException', 'Invalid PDF structure'))
    expect(mapped.code).toBe('INVALID_PDF')
  })

  it('maps unknown failures to INTERNAL and preserves the cause', () => {
    const cause = namedError('SomeOtherError', 'disk exploded')
    const mapped = mapPdfJsLoadError(cause)
    expect(mapped.code).toBe('INTERNAL')
    expect(mapped.cause).toBe(cause)
  })

  it('handles non-Error throws', () => {
    const mapped = mapPdfJsLoadError('string failure')
    expect(mapped.code).toBe('INTERNAL')
    expect(mapped.message).toBe('string failure')
  })
})
