/**
 * lib/parser/table/types.ts — geometry model for table detection.
 *
 * Everything here is still RAW: cell contents are untyped strings exactly as
 * printed. Converting "1,23,456.78" into a number, or deciding that column 2
 * is really the debit column, is downstream work (header mapping and row
 * parsing) — table detection's single job is geometry.
 */
import type { PositionedTextItem } from '../pdf/types'

/** Canonical statement fields a header cell can suggest. */
export type CanonicalField =
  | 'date'
  | 'valueDate'
  | 'description'
  | 'reference'
  | 'debit'
  | 'credit'
  | 'amount'
  | 'drcr'
  | 'balance'

/** One visual line of a page: items sharing a baseline, sorted by x. */
export interface Line {
  /** Top edge of the line (min y of its items), top-left origin. */
  y: number
  /** Representative text height of the line's items. */
  height: number
  items: PositionedTextItem[]
}

/** A cell: adjacent items of one line coalesced into a logical unit. */
export interface Cell {
  text: string
  /** Left edge. */
  x: number
  /** Right edge. */
  xEnd: number
}

/** A column of the detected table, anchored by its header cell geometry. */
export interface ColumnAnchor {
  /** 0-based column position, left to right. */
  index: number
  xStart: number
  xEnd: number
  /** Header cell text exactly as printed. */
  headerText: string
  /** Lexicon's guess at the canonical field; header mapping may override. */
  suggestedField: CanonicalField | null
}

/** One assembled data row: cell text per column slot (parallel to columns). */
export interface RawRow {
  /** 1-based page the row started on. */
  page: number
  /** Top edge of the row's first line. */
  y: number
  /** Cell text per column index; '' for empty slots. */
  cells: string[]
  /**
   * Number of continuation lines merged into this row (0 = single-line row).
   * Kept for audit/debugging of multiline description handling.
   */
  mergedLines: number
}

/** The transaction table detected on one page. */
export interface DetectedTable {
  page: number
  columns: ColumnAnchor[]
  /** y of the header line, or null when geometry was inherited from a previous page. */
  headerY: number | null
  /** Whether columns were inherited rather than detected on this page. */
  inheritedHeader: boolean
  rows: RawRow[]
}

/** Stage output: detected tables in page order (pages without tables are absent). */
export interface TableDetectionOutput {
  tables: DetectedTable[]
}
