import { describe, it, expect } from 'vitest'
import { DocumentClassificationStage, DIGITAL_CHAR_THRESHOLD } from '../classify'
import { runStage } from '../../core/stage'
import { createSilentLogger } from '../../core/logger'
import { PARSER_VERSION } from '../../core/version'
import type { ParseContext } from '../../core/types'
import type { PdfTextContent, PageText } from '../../pdf/types'

function ctx(): ParseContext {
  return { docId: 'test', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

/** Builds a PageText literal with the given character count. */
function page(pageNumber: number, charCount: number): PageText {
  return {
    pageNumber,
    width: 600,
    height: 800,
    charCount,
    items:
      charCount > 0
        ? [{ text: 'x'.repeat(charCount), x: 40, y: 50, width: 100, height: 11, fontName: 'F1' }]
        : [],
  }
}

function doc(...pages: PageText[]): PdfTextContent {
  return { pages, totalPages: pages.length }
}

const stage = new DocumentClassificationStage()

describe('DocumentClassificationStage', () => {
  it('classifies a text-rich document as digital with high confidence', async () => {
    const result = await runStage(stage, doc(page(1, 2400), page(2, 3100)), ctx())
    expect(result.data.kind).toBe('digital')
    expect(result.data.digitalPageCount).toBe(2)
    expect(result.data.scannedPageCount).toBe(0)
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.warnings).toHaveLength(0)
  })

  it('classifies a text-free document as scanned', async () => {
    const result = await runStage(stage, doc(page(1, 0), page(2, 0), page(3, 0)), ctx())
    expect(result.data.kind).toBe('scanned')
    expect(result.data.scannedPageCount).toBe(3)
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  it('classifies mixed documents and warns', async () => {
    const result = await runStage(stage, doc(page(1, 2800), page(2, 0)), ctx())
    expect(result.data.kind).toBe('mixed')
    expect(result.data.pages[0].kind).toBe('digital')
    expect(result.data.pages[1].kind).toBe('scanned')
    expect(result.warnings.some(w => w.code === 'MIXED_DOCUMENT')).toBe(true)
  })

  it('treats the exact threshold as digital', async () => {
    const result = await runStage(stage, doc(page(1, DIGITAL_CHAR_THRESHOLD)), ctx())
    expect(result.data.kind).toBe('digital')
  })

  it('flags near-threshold pages as ambiguous with reduced confidence', async () => {
    const nearThreshold = DIGITAL_CHAR_THRESHOLD + 10
    const result = await runStage(stage, doc(page(1, nearThreshold)), ctx())
    const ambiguous = result.warnings.find(w => w.code === 'AMBIGUOUS_PAGE')
    expect(ambiguous).toBeDefined()
    expect(ambiguous!.page).toBe(1)
    expect(result.confidence).toBeLessThan(0.7)
  })

  it('reports per-page classification with page numbers intact', async () => {
    const result = await runStage(stage, doc(page(1, 5000), page(2, 0), page(3, 4200)), ctx())
    expect(result.data.pages.map(p => [p.pageNumber, p.kind])).toEqual([
      [1, 'digital'],
      [2, 'scanned'],
      [3, 'digital'],
    ])
  })
})
