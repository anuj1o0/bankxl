/**
 * lib/parser/table/detect.ts — the table detection stage.
 *
 * Orchestrates the geometry helpers into the PipelineStage contract:
 * lines → header detection (lexicon-scored) → column anchors → data-line
 * slotting and classification → footer/gap cutoff → continuation merging.
 *
 * Pages that repeat no header inherit the previous page's column geometry
 * (continuation pages of real statements routinely drop the header row).
 */
import { ParserError } from '../core/errors'
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { PdfTextContent } from '../pdf/types'
import { buildLines, coalesceCells } from './lines'
import { scoreHeaderLine } from './header-lexicon'
import { looksLikeAmount, looksLikeDate } from './patterns'
import { mergeContinuationRows, type CandidateRow, type UnmergedTable } from './merge'
import type { Cell, ColumnAnchor, Line, TableDetectionOutput } from './types'

/** A line starting with any of these (normalized) ends the table region. */
const FOOTER_PHRASES: ReadonlyArray<string> = [
  'statement summary',
  'summary of account',
  'end of statement',
  'total debits',
  'total credits',
  'grand total',
  'legends',
  'this is a computer generated',
  'registered office',
  'unless the constituent notifies',
]

/** Data gap (multiples of nominal row spacing) that ends the table region. */
const TABLE_END_GAP_MULTIPLE = 3
const NOMINAL_ROW_SPACING = 16

function normalizeLineText(cells: ReadonlyArray<Cell>): string {
  return cells
    .map(c => c.text)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isFooterLine(cells: ReadonlyArray<Cell>): boolean {
  const text = normalizeLineText(cells)
  return FOOTER_PHRASES.some(p => text.startsWith(p))
}

/** Distance between a cell and a column anchor (0 when they overlap). */
function intervalDistance(cell: Cell, col: ColumnAnchor): number {
  if (cell.xEnd >= col.xStart && cell.x <= col.xEnd) return 0
  return cell.x > col.xEnd ? cell.x - col.xEnd : col.xStart - cell.xEnd
}

/** Slots a line's cells into column positions; cell texts joined on collision. */
function slotCells(cells: ReadonlyArray<Cell>, columns: ReadonlyArray<ColumnAnchor>): string[] {
  const slots: string[] = columns.map(() => '')
  for (const cell of cells) {
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (const col of columns) {
      const d = intervalDistance(cell, col)
      if (d < bestDist) {
        bestDist = d
        best = col.index
      }
    }
    slots[best] = slots[best] ? `${slots[best]} ${cell.text}` : cell.text
  }
  return slots
}

interface HeaderDetection {
  line: Line
  columns: ColumnAnchor[]
}

/** Finds the best-scoring header line on a page, if any qualifies. */
function detectHeader(lines: ReadonlyArray<Line>): HeaderDetection | null {
  let best: { line: Line; cells: Cell[]; fields: (ColumnAnchor['suggestedField'])[]; score: number } | null = null
  for (const line of lines) {
    const cells = coalesceCells(line)
    if (cells.length < 3) continue
    const score = scoreHeaderLine(cells)
    if (!score.isHeader) continue
    if (!best || score.matchedFields.length > best.score) {
      best = { line, cells, fields: score.cellFields, score: score.matchedFields.length }
    }
  }
  if (!best) return null
  return {
    line: best.line,
    columns: best.cells.map((c, i) => ({
      index: i,
      xStart: c.x,
      xEnd: c.xEnd,
      headerText: c.text,
      suggestedField: best.fields[i],
    })),
  }
}

/** Classifies one data line relative to the table's columns. */
function classifyLine(
  slots: ReadonlyArray<string>,
  columns: ReadonlyArray<ColumnAnchor>
): CandidateRow['kind'] | 'empty' {
  const dateCol = columns.find(c => c.suggestedField === 'date') ?? columns.find(c => c.suggestedField === 'valueDate')
  const moneyCols = columns.filter(
    c => c.suggestedField === 'debit' || c.suggestedField === 'credit' || c.suggestedField === 'amount' || c.suggestedField === 'balance'
  )

  const hasDate = dateCol
    ? looksLikeDate(slots[dateCol.index])
    : slots.some(s => looksLikeDate(s))
  const hasAmount =
    moneyCols.length > 0
      ? moneyCols.some(c => looksLikeAmount(slots[c.index]))
      : slots.some(s => looksLikeAmount(s))

  if (hasDate && hasAmount) return 'anchor'
  if (hasAmount) return 'amountOnly'
  if (slots.some(s => s.trim().length > 0)) return 'continuation'
  return 'empty'
}

/**
 * Table detection stage: PdfTextContent → TableDetectionOutput.
 *
 * Confidence = pages that yielded a table ÷ pages carrying enough text to
 * plausibly hold one. Throws NO_TABLE_FOUND when no page yields a table.
 */
export class TableDetectionStage implements PipelineStage<PdfTextContent, TableDetectionOutput> {
  readonly name = 'table-detection' as const

  async execute(
    input: PdfTextContent,
    ctx: ParseContext
  ): Promise<Omit<StageResult<TableDetectionOutput>, 'durationMs' | 'stage'>> {
    const warnings: StageWarning[] = []
    const unmerged: UnmergedTable[] = []
    let previousColumns: ColumnAnchor[] | null = null
    let candidatePages = 0

    for (const page of input.pages) {
      if (page.items.length === 0) continue
      candidatePages++

      const lines = buildLines(page.items)
      const header = detectHeader(lines)
      // Explicit annotation: `columns` feeds `previousColumns` at the loop
      // bottom, and without it TS flags the mutual reference as TS7022.
      const columns: ColumnAnchor[] | null = header?.columns ?? previousColumns
      if (!columns) {
        warnings.push({ code: 'PAGE_WITHOUT_TABLE', message: 'no header detected and none to inherit', page: page.pageNumber })
        continue
      }
      if (!header) {
        warnings.push({ code: 'HEADER_INHERITED', message: 'column geometry inherited from previous page', page: page.pageNumber })
      }

      const dataLines = header ? lines.filter(l => l.y > header.line.y) : lines
      const candidates: CandidateRow[] = []
      let prevLineY: number | null = null
      for (const line of dataLines) {
        const cells = coalesceCells(line)
        if (cells.length === 0) continue
        if (isFooterLine(cells)) break
        if (
          prevLineY !== null &&
          candidates.length >= 3 &&
          line.y - prevLineY > TABLE_END_GAP_MULTIPLE * NOMINAL_ROW_SPACING
        ) {
          break
        }
        const slots = slotCells(cells, columns)
        const kind = classifyLine(slots, columns)
        if (kind !== 'empty') {
          candidates.push({ page: page.pageNumber, y: line.y, yEnd: line.y + line.height, cells: slots, kind })
          prevLineY = line.y
        }
      }

      if (candidates.length === 0) {
        warnings.push({ code: 'PAGE_WITHOUT_TABLE', message: 'header present but no data rows', page: page.pageNumber })
        continue
      }

      unmerged.push({
        page: page.pageNumber,
        columns,
        headerY: header ? header.line.y : null,
        inheritedHeader: !header,
        candidates,
      })
      previousColumns = columns
    }

    const { tables, orphanedContinuations } = mergeContinuationRows(unmerged)
    const nonEmpty = tables.filter(t => t.rows.length > 0)

    if (nonEmpty.length === 0) {
      throw new ParserError('NO_TABLE_FOUND', 'No transaction table found on any page', 'table-detection', {
        pages: input.totalPages,
      })
    }
    if (orphanedContinuations > 0) {
      warnings.push({
        code: 'ORPHANED_CONTINUATIONS',
        message: `${orphanedContinuations} continuation line(s) had no row to attach to and were dropped`,
      })
    }

    const totalRows = nonEmpty.reduce((s, t) => s + t.rows.length, 0)
    ctx.log.info('tables_detected', {
      tables: nonEmpty.length,
      rows: totalRows,
      inheritedHeaders: nonEmpty.filter(t => t.inheritedHeader).length,
    })

    return {
      data: { tables: nonEmpty },
      confidence: candidatePages === 0 ? 0 : nonEmpty.length / candidatePages,
      warnings,
    }
  }
}
