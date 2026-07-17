/**
 * lib/parser/pdf/extract-text.ts — digital PDF text extraction stage.
 *
 * Wraps pdfjs-dist (legacy build, Node-compatible) behind the PipelineStage
 * contract: Buffer in, PdfTextContent out. Pages are processed strictly one
 * at a time and released (`page.cleanup()`) so memory stays flat regardless
 * of document length.
 *
 * Failure policy: document-level problems (not a PDF, encrypted) throw
 * typed ParserErrors; a single page failing to extract is a warning plus a
 * confidence reduction, never a document failure — losing 1 page of 40 must
 * not zero the other 39.
 */
import { ParserError } from '../core/errors'
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { PageText, PdfTextContent, PositionedTextItem } from './types'

/** Minimal structural typing of the pdfjs surface this stage touches. */
interface PdfJsTextItem {
  str: string
  /** [scaleX, skewY, skewX, scaleY, translateX, translateY] */
  transform: [number, number, number, number, number, number]
  width: number
  height: number
  fontName: string
}
interface PdfJsPage {
  getViewport(params: { scale: number }): { width: number; height: number }
  getTextContent(): Promise<{ items: ReadonlyArray<PdfJsTextItem | { type: string }> }>
  cleanup(): void
}
interface PdfJsDocument {
  numPages: number
  getPage(pageNumber: number): Promise<PdfJsPage>
}
/** getDocument returns a loading task; destroy() lives on the TASK in v6+. */
interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>
  destroy(): Promise<void>
}
interface PdfJsModule {
  getDocument(params: {
    data: Uint8Array
    verbosity: number
    isEvalSupported: boolean
    disableFontFace: boolean
    useSystemFonts: boolean
  }): PdfJsLoadingTask
}

let pdfjsModule: PdfJsModule | null = null

/** Loads pdfjs-dist once per process (legacy build works in Node without DOM). */
async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModule) {
    pdfjsModule = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule
  }
  return pdfjsModule
}

/**
 * Maps a pdfjs load failure to a typed ParserError.
 *
 * Exported for direct unit testing: encrypted-PDF fixtures can't be created
 * offline with our tooling, but the mapping logic can still be verified by
 * constructing errors with pdfjs's documented `name` values.
 *
 * @param err - Whatever pdfjs's getDocument().promise rejected with.
 * @returns A ParserError with code ENCRYPTED_PDF, INVALID_PDF, or INTERNAL.
 */
export function mapPdfJsLoadError(err: unknown): ParserError {
  const name = err instanceof Error ? err.name : ''
  const message = err instanceof Error ? err.message : String(err)
  if (name === 'PasswordException') {
    return new ParserError(
      'ENCRYPTED_PDF',
      'PDF is password-protected',
      'pdf-extraction',
      {},
      { cause: err }
    )
  }
  if (name === 'InvalidPDFException' || name === 'FormatError') {
    return new ParserError(
      'INVALID_PDF',
      `Not a readable PDF: ${message}`,
      'pdf-extraction',
      {},
      { cause: err }
    )
  }
  return new ParserError('INTERNAL', message, 'pdf-extraction', {}, { cause: err })
}

function isTextItem(item: PdfJsTextItem | { type: string }): item is PdfJsTextItem {
  return typeof (item as PdfJsTextItem).str === 'string'
}

/**
 * Converts one pdfjs text item into our top-left-origin model.
 *
 * pdfjs positions items in bottom-left-origin page space; transform[4] is
 * the x translation and transform[5] the BASELINE y. Top edge in top-left
 * space is pageHeight − (baselineY + height above baseline ≈ item.height).
 */
function toPositionedItem(item: PdfJsTextItem, pageHeight: number): PositionedTextItem {
  return {
    text: item.str,
    x: item.transform[4],
    y: pageHeight - item.transform[5] - item.height,
    width: item.width,
    height: item.height,
    fontName: item.fontName,
  }
}

/**
 * PDF text extraction stage: Buffer → PdfTextContent.
 *
 * Confidence = extractedPages / totalPages (1.0 when every page yielded a
 * text-content read, regardless of how much text it contained — "no text on
 * a page" is the classifier's business, not an extraction failure).
 */
export class PdfTextExtractionStage implements PipelineStage<Buffer, PdfTextContent> {
  readonly name = 'pdf-extraction' as const

  async execute(
    input: Buffer,
    ctx: ParseContext
  ): Promise<Omit<StageResult<PdfTextContent>, 'durationMs' | 'stage'>> {
    const pdfjs = await loadPdfJs()

    const loadingTask = pdfjs.getDocument({
      // Copy: pdfjs takes ownership of (and may detach) the buffer it is
      // given; callers must keep their Buffer usable.
      data: new Uint8Array(input),
      verbosity: 0,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    })
    let doc: PdfJsDocument
    try {
      doc = await loadingTask.promise
    } catch (err) {
      await loadingTask.destroy().catch(() => undefined)
      throw mapPdfJsLoadError(err)
    }

    const warnings: StageWarning[] = []
    const pages: PageText[] = []
    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        try {
          const page = await doc.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1 })
          const content = await page.getTextContent()
          const items: PositionedTextItem[] = []
          for (const raw of content.items) {
            if (isTextItem(raw) && raw.str.length > 0 && raw.str.trim().length > 0) {
              items.push(toPositionedItem(raw, viewport.height))
            }
          }
          pages.push({
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            items,
            charCount: items.reduce((sum, it) => sum + it.text.length, 0),
          })
          page.cleanup()
        } catch (err) {
          warnings.push({
            code: 'PAGE_EXTRACTION_FAILED',
            message: err instanceof Error ? err.message : String(err),
            page: pageNumber,
          })
        }
      }
    } finally {
      await loadingTask.destroy().catch(() => undefined)
    }

    if (pages.length === 0) {
      throw new ParserError(
        'INVALID_PDF',
        'No page could be read from this PDF',
        'pdf-extraction',
        { totalPages: doc.numPages, failedPages: warnings.length }
      )
    }

    const totalPages = pages.length + warnings.length
    ctx.log.info('pdf_text_extracted', {
      pages: pages.length,
      failedPages: warnings.length,
      chars: pages.reduce((s, p) => s + p.charCount, 0),
    })

    return {
      data: { pages, totalPages },
      confidence: pages.length / totalPages,
      warnings,
    }
  }
}
