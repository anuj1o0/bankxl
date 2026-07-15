/**
 * tests/helpers/pdf-fixtures.ts — synthetic PDF builders for parser tests.
 *
 * Fixtures are generated at test time with pdf-lib (already a production
 * dependency), so the repo stays free of binary fixtures and every test is
 * deterministic and fully offline. These produce REAL PDFs with real text
 * layers — pdfjs extracts them exactly as it would a bank's e-statement.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'

export const FIXTURE_PAGE_WIDTH = 600
export const FIXTURE_PAGE_HEIGHT = 800

/**
 * Builds a digital PDF: one page per entry, each drawing the given lines
 * top-to-bottom starting near the top edge.
 *
 * @param pagesOfLines - Outer array = pages; inner array = text lines.
 * @returns The PDF file as a Buffer.
 */
export async function makeDigitalPdf(pagesOfLines: string[][]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const lines of pagesOfLines) {
    const page = doc.addPage([FIXTURE_PAGE_WIDTH, FIXTURE_PAGE_HEIGHT])
    let y = FIXTURE_PAGE_HEIGHT - 50
    for (const line of lines) {
      page.drawText(line, { x: 40, y, size: 11, font })
      y -= 18
    }
  }
  return Buffer.from(await doc.save())
}

/**
 * Builds a "scanned-like" PDF: pages with drawn shapes but NO text layer —
 * exactly what a scanner or phone-camera PDF looks like to a text extractor.
 */
export async function makeScannedLikePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([FIXTURE_PAGE_WIDTH, FIXTURE_PAGE_HEIGHT])
    page.drawRectangle({ x: 30, y: 30, width: 540, height: 740, borderWidth: 1 })
  }
  return Buffer.from(await doc.save())
}

/** ~40 chars per line × enough lines to clear the digital threshold easily. */
export function richTextLines(lineCount = 12): string[] {
  return Array.from(
    { length: lineCount },
    (_, i) => `01/04/2026 UPI-REF00${i} GROCERY STORE PVT LTD 1,234.5${i}`
  )
}
