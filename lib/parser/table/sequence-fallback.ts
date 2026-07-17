/**
 * lib/parser/table/sequence-fallback.ts — headerless transaction extraction.
 *
 * Neo-bank and card-layout statements often have no tabular header: dates
 * and amounts float in predictable positions but without column headers.
 * This module scans raw lines for [Date] [Text] [Amount] sequences and
 * synthesises a virtual table that the rest of the pipeline can process.
 *
 * Only activates when the primary header-based detector fails to find
 * any table on any page.
 */
import type { Line, Cell, ColumnAnchor, DetectedTable, RawRow } from './types'
import { coalesceCells } from './lines'
import { looksLikeDate, looksLikeAmount } from './patterns'

interface SequenceMatch {
  dateCells: Cell[]
  textCells: Cell[]
  amountCells: Cell[]
}

function matchSequence(cells: ReadonlyArray<Cell>): SequenceMatch | null {
  const dates: Cell[] = []
  const texts: Cell[] = []
  const amounts: Cell[] = []

  for (const cell of cells) {
    if (looksLikeDate(cell.text)) {
      dates.push(cell)
    } else if (looksLikeAmount(cell.text)) {
      amounts.push(cell)
    } else if (cell.text.trim().length > 0) {
      texts.push(cell)
    }
  }
  if (dates.length === 0 || amounts.length === 0) return null
  return { dateCells: dates, textCells: texts, amountCells: amounts }
}

/**
 * Attempts headerless extraction from raw page lines.
 *
 * Scans for lines following a [Date] [Text...] [Amount...] pattern.
 * Synthesises virtual columns and rows compatible with the rest of
 * the pipeline. Returns null when too few matches are found.
 */
export function extractWithoutHeader(
  allPageLines: ReadonlyArray<{ pageNumber: number; lines: ReadonlyArray<Line> }>
): DetectedTable[] | null {
  const matched: Array<{
    page: number; line: Line; seq: SequenceMatch
  }> = []

  for (const { pageNumber, lines } of allPageLines) {
    for (const line of lines) {
      const cells = coalesceCells(line)
      if (cells.length < 2) continue
      const seq = matchSequence(cells)
      if (seq) matched.push({ page: pageNumber, line, seq })
    }
  }

  if (matched.length < 3) return null

  // Build virtual columns from the first match's geometry.
  const ref = matched[0].seq
  const dateX = ref.dateCells[0]
  const descX = ref.textCells.length > 0
    ? ref.textCells[0]
    : { x: dateX.xEnd + 5, xEnd: ref.amountCells[0].x - 5 }
  const amtX = ref.amountCells[0]

  const columns: ColumnAnchor[] = [
    { index: 0, xStart: dateX.x, xEnd: dateX.xEnd, headerText: 'Date', suggestedField: 'date' },
    { index: 1, xStart: descX.x, xEnd: descX.xEnd, headerText: 'Description', suggestedField: 'description' },
  ]

  if (ref.amountCells.length >= 2) {
    const sorted = [...ref.amountCells].sort((a, b) => a.x - b.x)
    columns.push(
      { index: 2, xStart: sorted[0].x, xEnd: sorted[0].xEnd, headerText: 'Debit', suggestedField: 'debit' },
      { index: 3, xStart: sorted[1].x, xEnd: sorted[1].xEnd, headerText: 'Credit', suggestedField: 'credit' },
    )
    if (sorted.length >= 3) {
      columns.push(
        { index: 4, xStart: sorted[2].x, xEnd: sorted[2].xEnd, headerText: 'Balance', suggestedField: 'balance' },
      )
    }
  } else {
    columns.push(
      { index: 2, xStart: amtX.x, xEnd: amtX.xEnd, headerText: 'Amount', suggestedField: 'amount' },
    )
  }

  // Group by page and build rows.
  const byPage = new Map<number, typeof matched>()
  for (const m of matched) {
    const arr = byPage.get(m.page) ?? []
    arr.push(m)
    byPage.set(m.page, arr)
  }

  const tables: DetectedTable[] = []
  for (const [page, entries] of byPage) {
    const rows: RawRow[] = entries.map(e => {
      const cells = new Array(columns.length).fill('')
      cells[0] = e.seq.dateCells.map(c => c.text).join(' ')
      cells[1] = e.seq.textCells.map(c => c.text).join(' ')
      if (e.seq.amountCells.length >= 2) {
        const sorted = [...e.seq.amountCells].sort((a, b) => a.x - b.x)
        cells[2] = sorted[0].text
        cells[3] = sorted[1].text
        if (sorted.length >= 3) cells[4] = sorted[2].text
      } else {
        cells[2] = e.seq.amountCells[0].text
      }
      return { page, y: e.line.y, cells, mergedLines: 0 }
    })
    tables.push({
      page,
      columns,
      headerY: null,
      inheritedHeader: false,
      rows,
    })
  }

  return tables.length > 0 ? tables : null
}
