/**
 * lib/parser/classify/classify.ts — digital vs scanned classification stage.
 *
 * Decides, per page and per document, whether the PDF carries a usable text
 * layer (digital e-statement) or is image-only (scan/photo) and must go to
 * the OCR path. Purely a function of the extraction stage's output — no I/O.
 *
 * Heuristic: a real statement page carries thousands of extractable
 * characters; a scanned page carries none (or a handful from a watermark or
 * footer stamp). Pages at or above DIGITAL_CHAR_THRESHOLD characters are
 * digital, below it scanned. Document kind is the aggregate: all digital →
 * 'digital', all scanned → 'scanned', otherwise 'mixed' (e.g. a digital
 * statement with a scanned cheque-image appendix page).
 */
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { PdfTextContent } from '../pdf/types'

/** Per-page character count at/above which a page counts as digital. */
export const DIGITAL_CHAR_THRESHOLD = 150

export type DocumentKind = 'digital' | 'scanned' | 'mixed'
export type PageKind = 'digital' | 'scanned'

export interface PageClassification {
  pageNumber: number
  kind: PageKind
  charCount: number
}

export interface ClassificationResult {
  kind: DocumentKind
  pages: PageClassification[]
  /** Convenience counts for logging/routing. */
  digitalPageCount: number
  scannedPageCount: number
}

/**
 * Confidence in one page's classification: how decisively its character
 * count sits away from the threshold. 300+ chars or 0 chars ≈ 1.0; counts
 * hovering near the threshold approach 0.5.
 */
function pageConfidence(charCount: number): number {
  const distance = Math.abs(charCount - DIGITAL_CHAR_THRESHOLD) / DIGITAL_CHAR_THRESHOLD
  return Math.min(1, 0.5 + distance / 2)
}

/** Classification stage: PdfTextContent → ClassificationResult. */
export class DocumentClassificationStage implements PipelineStage<PdfTextContent, ClassificationResult> {
  readonly name = 'classification' as const

  async execute(
    input: PdfTextContent,
    ctx: ParseContext
  ): Promise<Omit<StageResult<ClassificationResult>, 'durationMs' | 'stage'>> {
    const warnings: StageWarning[] = []

    const pages: PageClassification[] = input.pages.map(p => ({
      pageNumber: p.pageNumber,
      kind: p.charCount >= DIGITAL_CHAR_THRESHOLD ? 'digital' : 'scanned',
      charCount: p.charCount,
    }))

    const digitalPageCount = pages.filter(p => p.kind === 'digital').length
    const scannedPageCount = pages.length - digitalPageCount
    const kind: DocumentKind =
      scannedPageCount === 0 ? 'digital' : digitalPageCount === 0 ? 'scanned' : 'mixed'

    if (kind === 'mixed') {
      warnings.push({
        code: 'MIXED_DOCUMENT',
        message: `${digitalPageCount} digital and ${scannedPageCount} scanned page(s) in one document`,
      })
    }
    for (const p of pages) {
      // A near-threshold page is worth flagging: it usually means a sparse
      // text layer (cover page, or OCR text baked in by another tool).
      if (Math.abs(p.charCount - DIGITAL_CHAR_THRESHOLD) < DIGITAL_CHAR_THRESHOLD / 3) {
        warnings.push({
          code: 'AMBIGUOUS_PAGE',
          message: `page ${p.pageNumber} has ${p.charCount} chars — near the digital/scanned threshold`,
          page: p.pageNumber,
        })
      }
    }

    const confidence =
      pages.length === 0 ? 0 : pages.reduce((s, p) => s + pageConfidence(p.charCount), 0) / pages.length

    ctx.log.info('document_classified', {
      kind,
      digitalPages: digitalPageCount,
      scannedPages: scannedPageCount,
    })

    return {
      data: { kind, pages, digitalPageCount, scannedPageCount },
      confidence,
      warnings,
    }
  }
}
