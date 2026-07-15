/**
 * lib/parser/table/merge.ts — continuation-row merging.
 *
 * Statement descriptions frequently wrap: the printed row carries the date
 * and amounts, and one or more following lines carry only the rest of the
 * narration in the description column. This module folds those continuation
 * candidates into their owning row — including across page boundaries,
 * where a description's tail lands at the top of the next page's table.
 */
import type { ColumnAnchor, DetectedTable, RawRow } from './types'

/** How a data line was classified during detection. */
export type CandidateKind = 'anchor' | 'amountOnly' | 'continuation'

/** A classified data line, before continuation merging. */
export interface CandidateRow {
  page: number
  y: number
  /** Bottom edge of the candidate's line — used for proximity checks. */
  yEnd: number
  cells: string[]
  kind: CandidateKind
}

/** A detected table whose rows have not been assembled yet. */
export interface UnmergedTable {
  page: number
  columns: ColumnAnchor[]
  headerY: number | null
  inheritedHeader: boolean
  candidates: CandidateRow[]
}

/**
 * A continuation may sit at most this many line-heights below the previous
 * candidate; anything further is page furniture, not a wrapped description.
 */
const CONTINUATION_MAX_GAP_LINES = 2.5

/** Typical statement line height (points) used for the proximity budget. */
const NOMINAL_LINE_HEIGHT = 14

/** Obvious page furniture that must never be merged into a description. */
const FURNITURE_RE = /^page\s*\d+(\s*of\s*\d+)?$/i

function descriptionIndex(columns: ReadonlyArray<ColumnAnchor>): number {
  const suggested = columns.find(c => c.suggestedField === 'description')
  if (suggested) return suggested.index
  // Widest column is the best guess when no header suggested a description.
  let widest = 0
  for (const c of columns) {
    if (c.xEnd - c.xStart > columns[widest].xEnd - columns[widest].xStart) widest = c.index
  }
  return widest
}

/**
 * Assembles final rows from classified candidates, folding continuations
 * into the row above them — across page boundaries when the continuation is
 * the first candidate of the next table.
 *
 * @param tables - Unmerged tables in page order.
 * @returns Tables with assembled rows, plus the count of continuations that
 *   had no row to attach to (dropped — reported by the stage as a warning).
 */
export function mergeContinuationRows(tables: ReadonlyArray<UnmergedTable>): {
  tables: DetectedTable[]
  orphanedContinuations: number
} {
  const out: DetectedTable[] = tables.map(t => ({
    page: t.page,
    columns: t.columns,
    headerY: t.headerY,
    inheritedHeader: t.inheritedHeader,
    rows: [],
  }))

  let orphaned = 0
  let lastRow: RawRow | null = null
  let lastRowDescIdx = 0
  // y where the previous candidate (row or merged continuation) ended; used
  // for the proximity budget. Reset across pages: page tops start fresh.
  let lastYEnd: number | null = null
  let lastPage: number | null = null

  tables.forEach((table, ti) => {
    const descIdx = descriptionIndex(table.columns)
    for (const cand of table.candidates) {
      const text = cand.cells.filter(c => c.length > 0).join(' ').trim()
      if (cand.kind === 'continuation') {
        const isFurniture = FURNITURE_RE.test(text)
        const samePageGapOk =
          lastPage === cand.page &&
          lastYEnd !== null &&
          cand.y - lastYEnd <= CONTINUATION_MAX_GAP_LINES * NOMINAL_LINE_HEIGHT
        // Cross-page continuation: first candidate of a table on a later
        // page, attaching to the last row of the previous page's table.
        const crossPageOk = lastPage !== null && cand.page > lastPage && out[ti].rows.length === 0
        if (!lastRow || isFurniture || (!samePageGapOk && !crossPageOk)) {
          orphaned++
          continue
        }
        const fragment = cand.cells[descIdx]?.trim() || text
        if (fragment.length > 0) {
          lastRow.cells[lastRowDescIdx] = `${lastRow.cells[lastRowDescIdx]} ${fragment}`.trim()
          lastRow.mergedLines++
        }
        lastYEnd = cand.yEnd
        lastPage = cand.page
        continue
      }

      const row: RawRow = { page: cand.page, y: cand.y, cells: [...cand.cells], mergedLines: 0 }
      out[ti].rows.push(row)
      lastRow = row
      lastRowDescIdx = descIdx
      lastYEnd = cand.yEnd
      lastPage = cand.page
    }
  })

  return { tables: out, orphanedContinuations: orphaned }
}
