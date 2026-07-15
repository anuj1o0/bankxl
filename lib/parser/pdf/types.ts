/**
 * lib/parser/pdf/types.ts — positioned-text model produced by the PDF
 * extraction stage and consumed by classification, table detection, and
 * bank rule modules.
 *
 * Coordinate convention: TOP-LEFT origin, y increasing downward, units are
 * PDF points (1/72"). Native PDF space is bottom-left/upward; the extraction
 * stage normalizes so that downstream row logic can sort by `y` ascending to
 * read a page top-to-bottom.
 */

/** One contiguous run of text placed on a page. */
export interface PositionedTextItem {
  /** The text content of this run (never empty — empty runs are dropped). */
  text: string
  /** Left edge, points from the page's left edge. */
  x: number
  /** Top edge, points from the page's top edge (top-left origin). */
  y: number
  /** Rendered width in points. */
  width: number
  /** Rendered height in points (≈ font size for single-line runs). */
  height: number
  /** Internal font identifier — same font ⇒ same name within a document. */
  fontName: string
}

/** All positioned text of a single page. */
export interface PageText {
  /** 1-based page number. */
  pageNumber: number
  /** Page width in points. */
  width: number
  /** Page height in points. */
  height: number
  /** Text runs in extraction order (NOT guaranteed reading order). */
  items: PositionedTextItem[]
  /** Total characters across items — the classifier's primary signal. */
  charCount: number
}

/** Positioned text for the whole document. */
export interface PdfTextContent {
  pages: PageText[]
  totalPages: number
}
