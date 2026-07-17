/**
 * lib/parser/ocr/ocr-extract.ts — local OCR via Tesseract.js.
 *
 * Converts scanned/image-only PDF pages into PositionedTextItem arrays
 * that the rest of the deterministic pipeline can process identically
 * to native digital text. Runs entirely locally — no cloud API calls.
 *
 * Architecture:
 *  1. pdfjs renders each scanned page to a canvas (image).
 *  2. Tesseract.js runs OCR on the image, producing word-level bounding boxes.
 *  3. Bounding boxes are normalized to the same coordinate system as
 *     the PDF extraction stage (top-left origin, PDF points).
 *  4. The result is a PdfTextContent that feeds directly into
 *     TableDetectionStage.
 */
import type { PdfTextContent, PageText, PositionedTextItem } from '../pdf/types'
import type { StageLogger } from '../core/types'

// Webpack-opaque require: prevents static analysis from bundling optional deps.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicRequire = typeof require !== 'undefined' ? require : (id: string) => { throw new Error(`Cannot require ${id}`) }

function tryRequire(id: string): any {
  try { return dynamicRequire(id) } catch { return null }
}

let tesseractModule: any = null

function loadTesseract(): any {
  if (!tesseractModule) {
    tesseractModule = tryRequire('tesseract.js')
  }
  return tesseractModule
}

/** Whether all OCR dependencies (tesseract.js + canvas) are available. */
export async function isOcrAvailable(): Promise<boolean> {
  if (!loadTesseract()) return false
  return tryRequire('canvas') !== null
}

interface OcrOptions {
  log: StageLogger
  /** Languages to load (Tesseract codes). Default: ['eng']. */
  languages?: string[]
  /** DPI to render PDF pages at for OCR. Default: 300. */
  dpi?: number
}

/**
 * Runs OCR on a PDF buffer's scanned pages and returns positioned text
 * in the same format as the digital PDF extraction stage.
 */
export async function ocrExtract(
  pdfBuffer: Buffer,
  scannedPageNumbers: ReadonlyArray<number>,
  options: OcrOptions
): Promise<PageText[]> {
  const Tesseract = loadTesseract()
  if (!Tesseract) throw new Error('tesseract.js is not installed')

  const canvasLib = tryRequire('canvas')
  if (!canvasLib) throw new Error('canvas is not installed')

  const langs = (options.languages ?? ['eng']).join('+')
  const dpi = options.dpi ?? 300

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) })
  const doc = await loadingTask.promise

  const pages: PageText[] = []
  const worker = await Tesseract.createWorker(langs)

  try {
    for (const pageNum of scannedPageNumbers) {
      options.log.info('ocr_page_start', { page: pageNum })
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: dpi / 72 })

      const canvas = canvasLib.createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')
      await (page.render as any)({ canvasContext: ctx, viewport }).promise

      const imageData = canvas.toBuffer('image/png')
      const { data } = await worker.recognize(imageData)

      const scale = 72 / dpi
      const items: PositionedTextItem[] = []
      for (const word of (data as any).words) {
        const text = word.text.trim()
        if (!text) continue
        items.push({
          text,
          x: word.bbox.x0 * scale,
          y: word.bbox.y0 * scale,
          width: (word.bbox.x1 - word.bbox.x0) * scale,
          height: (word.bbox.y1 - word.bbox.y0) * scale,
          fontName: 'ocr',
        })
      }

      const pdfWidth = page.getViewport({ scale: 1 }).width
      const pdfHeight = page.getViewport({ scale: 1 }).height

      pages.push({
        pageNumber: pageNum,
        width: pdfWidth,
        height: pdfHeight,
        items,
        charCount: items.reduce((s, item) => s + item.text.length, 0),
      })

      options.log.info('ocr_page_done', { page: pageNum, words: items.length })
      page.cleanup()
    }
  } finally {
    await worker.terminate()
    await loadingTask.destroy().catch(() => undefined)
  }

  return pages
}

/**
 * Merges OCR-extracted pages into an existing PdfTextContent, replacing
 * scanned pages with their OCR equivalents.
 */
export function mergeOcrPages(
  original: PdfTextContent,
  ocrPages: ReadonlyArray<PageText>
): PdfTextContent {
  const ocrMap = new Map(ocrPages.map(p => [p.pageNumber, p]))
  return {
    totalPages: original.totalPages,
    pages: original.pages.map(p => ocrMap.get(p.pageNumber) ?? p),
  }
}
