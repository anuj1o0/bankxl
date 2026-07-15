/**
 * lib/parser/table/lines.ts — visual line and cell assembly.
 *
 * PDFs place text as unordered runs; this module turns a page's runs into
 * reading-order structure:
 *   buildLines()    — cluster items sharing a baseline into Lines (top→bottom)
 *   coalesceCells() — merge adjacent items of a line into logical Cells
 *                     ("Withdrawal" + "Amt." → one header cell)
 *
 * Pure geometry: no lexicon, no parsing, no I/O.
 */
import type { PositionedTextItem } from '../pdf/types'
import type { Cell, Line } from './types'

/**
 * Fraction of an item's height two items may differ in vertical center and
 * still count as the same visual line. 0.5 tolerates baseline jitter from
 * mixed font sizes without gluing adjacent 12-14pt statement rows together.
 */
const LINE_CENTER_TOLERANCE = 0.5

/** Horizontal gap (points) at or below which two items merge into one cell. */
const CELL_GAP_PT = 8

/**
 * Groups a page's text items into visual lines.
 *
 * Items are sorted by vertical center; an item joins the current line when
 * its center is within LINE_CENTER_TOLERANCE × height of the line's running
 * center, otherwise it starts a new line. Output lines are top→bottom, items
 * within each line left→right.
 *
 * @param items - Positioned items of ONE page (top-left origin).
 * @returns Lines in reading order. Empty input yields an empty array.
 */
export function buildLines(items: ReadonlyArray<PositionedTextItem>): Line[] {
  if (items.length === 0) return []

  const byCenter = [...items].sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2))

  const lines: { centerSum: number; items: PositionedTextItem[] }[] = []
  for (const item of byCenter) {
    const center = item.y + item.height / 2
    const current = lines[lines.length - 1]
    if (current) {
      const runningCenter = current.centerSum / current.items.length
      const tolerance = Math.max(item.height, current.items[0].height) * LINE_CENTER_TOLERANCE
      if (Math.abs(center - runningCenter) <= tolerance) {
        current.items.push(item)
        current.centerSum += center
        continue
      }
    }
    lines.push({ centerSum: center, items: [item] })
  }

  return lines.map(l => {
    const sorted = [...l.items].sort((a, b) => a.x - b.x)
    return {
      y: Math.min(...sorted.map(i => i.y)),
      height: Math.max(...sorted.map(i => i.height)),
      items: sorted,
    }
  })
}

/**
 * Coalesces a line's items into logical cells: consecutive items whose
 * horizontal gap is ≤ CELL_GAP_PT belong to the same cell (a header printed
 * as several runs), larger gaps start a new cell (a real column boundary).
 *
 * @param line - A line produced by buildLines() (items sorted by x).
 * @returns Cells left→right; joined text is single-space separated unless the
 *   runs touch (gap < 1pt), in which case they concatenate directly.
 */
export function coalesceCells(line: Line): Cell[] {
  const cells: Cell[] = []
  for (const item of line.items) {
    const prev = cells[cells.length - 1]
    if (prev && item.x - prev.xEnd <= CELL_GAP_PT) {
      const glue = item.x - prev.xEnd < 1 ? '' : ' '
      prev.text = `${prev.text}${glue}${item.text}`.trim()
      prev.xEnd = Math.max(prev.xEnd, item.x + item.width)
    } else {
      cells.push({ text: item.text.trim(), x: item.x, xEnd: item.x + item.width })
    }
  }
  return cells.filter(c => c.text.length > 0)
}
