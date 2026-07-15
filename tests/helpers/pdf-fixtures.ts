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

// ─── Statement-table fixtures ────────────────────────────────────────────────

/** Column x-positions used by the synthetic statement fixture. */
export const STMT_COLS = { date: 40, desc: 115, ref: 300, debit: 380, credit: 455, balance: 525 } as const

export interface FixtureRow {
  date: string
  desc: string
  /** Optional extra narration lines printed under the description cell. */
  descContinuations?: string[]
  ref?: string
  debit?: string
  credit?: string
  balance: string
}

export interface FixturePage {
  /** Letterhead lines printed above the table (bank name, account details). */
  titleLines?: string[]
  /** Print the header row on this page (continuation pages often omit it). */
  withHeader: boolean
  rows: FixtureRow[]
  /** Print a "Statement Summary" footer block after the rows. */
  withFooter?: boolean
}

/**
 * Builds a synthetic bank-statement PDF with a real transaction table:
 * fixed column x-positions, optional per-page header, wrapped descriptions,
 * and an optional summary footer — the shapes table detection must handle.
 */
export async function makeStatementPdf(pages: FixturePage[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const size = 9

  for (const spec of pages) {
    const page = doc.addPage([FIXTURE_PAGE_WIDTH, FIXTURE_PAGE_HEIGHT])
    let y = FIXTURE_PAGE_HEIGHT - 60

    for (const title of spec.titleLines ?? []) {
      page.drawText(title, { x: STMT_COLS.date, y, size: 10, font })
      y -= 16
    }
    if (spec.titleLines?.length) y -= 8

    if (spec.withHeader) {
      page.drawText('Date', { x: STMT_COLS.date, y, size, font })
      page.drawText('Particulars', { x: STMT_COLS.desc, y, size, font })
      page.drawText('Chq./Ref.No.', { x: STMT_COLS.ref, y, size, font })
      page.drawText('Withdrawal Amt.', { x: STMT_COLS.debit, y, size, font })
      page.drawText('Deposit Amt.', { x: STMT_COLS.credit, y, size, font })
      page.drawText('Closing Balance', { x: STMT_COLS.balance, y, size, font })
      y -= 20
    }

    for (const row of spec.rows) {
      page.drawText(row.date, { x: STMT_COLS.date, y, size, font })
      page.drawText(row.desc, { x: STMT_COLS.desc, y, size, font })
      if (row.ref) page.drawText(row.ref, { x: STMT_COLS.ref, y, size, font })
      if (row.debit) page.drawText(row.debit, { x: STMT_COLS.debit, y, size, font })
      if (row.credit) page.drawText(row.credit, { x: STMT_COLS.credit, y, size, font })
      page.drawText(row.balance, { x: STMT_COLS.balance, y, size, font })
      y -= 14
      for (const cont of row.descContinuations ?? []) {
        page.drawText(cont, { x: STMT_COLS.desc, y, size, font })
        y -= 14
      }
    }

    if (spec.withFooter) {
      y -= 30
      page.drawText('Statement Summary', { x: STMT_COLS.date, y, size: 10, font })
      y -= 16
      page.drawText('Total Debits: 4 Total Credits: 2', { x: STMT_COLS.date, y, size, font })
    }
  }

  return Buffer.from(await doc.save())
}
