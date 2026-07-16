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
import { expandCompoundHeaderCells, matchHeaderCell, scoreHeaderLine } from './header-lexicon'
import { looksLikeAmount, looksLikeDate } from './patterns'
import { mergeContinuationRows, type CandidateRow, type UnmergedTable } from './merge'
import { extractWithoutHeader } from './sequence-fallback'
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
  'disclaimer',
  'end of statement',
  'customer care',
  'abbreviations',
  'important please',
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

function nearestColumn(x: number, xEnd: number, columns: ReadonlyArray<ColumnAnchor>): number {
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (const col of columns) {
    const d = xEnd >= col.xStart && x <= col.xEnd ? 0 : x > col.xEnd ? x - col.xEnd : col.xStart - xEnd
    if (d < bestDist) {
      bestDist = d
      best = col.index
    }
  }
  return best
}

/**
 * Slots a line's cells into column positions; cell texts joined on collision.
 *
 * A cell whose x-range spans SEVERAL column anchors gets token-level
 * treatment: browser-print PDFs emit whole segments as one text run
 * ("02/04/2026 02/04/2026 UPI/CR/..." or "82,500.00 1,27,882.50"), so each
 * token's x-position is estimated by its character fraction of the run and
 * slotted individually. Single-column cells keep the plain path.
 */
function slotCells(cells: ReadonlyArray<Cell>, columns: ReadonlyArray<ColumnAnchor>): string[] {
  const slots: string[] = columns.map(() => '')
  const put = (index: number, text: string) => {
    slots[index] = slots[index] ? `${slots[index]} ${text}` : text
  }
  for (const cell of cells) {
    const spanned = columns.filter(c => cell.xEnd >= c.xStart && cell.x <= c.xEnd)
    const tokens = cell.text.split(/\s+/).filter(t => t.length > 0)
    if (spanned.length >= 2 && tokens.length >= 2) {
      const width = cell.xEnd - cell.x
      const len = cell.text.length
      let offset = 0
      for (const token of tokens) {
        const start = cell.text.indexOf(token, offset)
        offset = start + token.length
        const tokenX = cell.x + (start / len) * width
        const tokenXEnd = cell.x + (offset / len) * width
        put(nearestColumn(tokenX, tokenXEnd, columns), token)
      }
    } else {
      put(nearestColumn(cell.x, cell.xEnd, columns), cell.text)
    }
  }
  return slots
}

interface HeaderDetection {
  line: Line
  columns: ColumnAnchor[]
}

interface HeaderCandidate {
  index: number
  line: Line
  cells: Cell[]
  fields: (ColumnAnchor['suggestedField'])[]
  score: number
}

/**
 * Finds the best-scoring header line on a page, if any qualifies.
 *
 * Compound cells are expanded first ("Debit (Rs) Credit (Rs)" → two
 * anchors — observed on a real SBI statement where that single cell
 * swallowed the credit column). After the winning line is chosen,
 * lexicon-matching cells from IMMEDIATELY adjacent lines are absorbed as
 * additional anchors: multi-line headers ("Value" / "Date" stacked,
 * "Balance" with "(Rs)" beneath) otherwise lose whole columns.
 */
function detectHeader(lines: ReadonlyArray<Line>): HeaderDetection | null {
  let best: HeaderCandidate | null = null
  lines.forEach((line, index) => {
    const cells = expandCompoundHeaderCells(coalesceCells(line))
    if (cells.length < 3) return
    const score = scoreHeaderLine(cells)
    if (!score.isHeader) return
    if (!best || score.matchedFields.length > best.score) {
      best = { index, line, cells, fields: score.cellFields, score: score.matchedFields.length }
    }
  })

  // Fallback: stacked multi-line headers where date and money fields sit on
  // separate lines. Accept any line with ≥2 fields that has EITHER date OR
  // money, then verify adjacent lines (±2) supply the missing half.
  if (!best) {
    lines.forEach((line, index) => {
      const cells = expandCompoundHeaderCells(coalesceCells(line))
      if (cells.length < 2) return
      const score = scoreHeaderLine(cells)
      if (score.matchedFields.length < 2) return

      const hasDate = score.matchedFields.includes('date') || score.matchedFields.includes('valueDate')
      const hasMoney = score.matchedFields.some(f => f === 'debit' || f === 'credit' || f === 'amount' || f === 'balance')
      if (!hasDate && !hasMoney) return

      const maxGap = Math.max(line.height, 10) * 3
      let neighborDate = hasDate
      let neighborMoney = hasMoney
      for (const offset of [-2, -1, 1, 2]) {
        const neighbor = lines[index + offset]
        if (!neighbor || Math.abs(neighbor.y - line.y) > maxGap) continue
        for (const cell of coalesceCells(neighbor)) {
          const field = matchHeaderCell(cell.text)
          if (field === 'date' || field === 'valueDate') neighborDate = true
          if (field === 'debit' || field === 'credit' || field === 'amount' || field === 'balance') neighborMoney = true
        }
        if (neighborDate && neighborMoney) break
      }
      if (!neighborDate || !neighborMoney) return

      if (!best || score.matchedFields.length > best.score) {
        best = { index, line, cells, fields: score.cellFields, score: score.matchedFields.length }
      }
    })
  }

  if (!best) return null
  const chosen: HeaderCandidate = best

  const anchors = chosen.cells.map((c, i) => ({ x: c.x, xEnd: c.xEnd, text: c.text, field: chosen.fields[i] }))

  // Absorb header fragments from the lines directly above/below the header.
  // Check ±2 lines to handle 3-line stacked headers.
  let maxAbsorbedY = chosen.line.y + chosen.line.height
  const maxGap = Math.max(chosen.line.height, 10) * 3
  for (const neighborIdx of [chosen.index - 2, chosen.index - 1, chosen.index + 1, chosen.index + 2]) {
    const neighbor = lines[neighborIdx]
    if (!neighbor) continue
    if (Math.abs(neighbor.y - chosen.line.y) > maxGap) continue
    for (const cell of coalesceCells(neighbor)) {
      const field = matchHeaderCell(cell.text)
      if (!field) continue
      const overlapIdx = anchors.findIndex(a => cell.xEnd >= a.x && cell.x <= a.xEnd)
      if (overlapIdx >= 0) {
        if (anchors[overlapIdx].field === null) {
          const combined = `${anchors[overlapIdx].text} ${cell.text}`
          anchors[overlapIdx].field = matchHeaderCell(combined) ?? field
          anchors[overlapIdx].text = combined
          anchors[overlapIdx].x = Math.min(anchors[overlapIdx].x, cell.x)
          anchors[overlapIdx].xEnd = Math.max(anchors[overlapIdx].xEnd, cell.xEnd)
          maxAbsorbedY = Math.max(maxAbsorbedY, neighbor.y + neighbor.height)
        }
        continue
      }
      anchors.push({ x: cell.x, xEnd: cell.xEnd, text: cell.text, field })
      maxAbsorbedY = Math.max(maxAbsorbedY, neighbor.y + neighbor.height)
    }
  }

  anchors.sort((a, b) => a.x - b.x)

  // Use the lowest absorbed line's y so data starts after ALL header lines.
  const headerLine: Line = maxAbsorbedY > chosen.line.y + chosen.line.height
    ? { y: maxAbsorbedY - chosen.line.height, height: chosen.line.height, items: chosen.line.items }
    : chosen.line

  return {
    line: headerLine,
    columns: anchors.map((a, i) => ({
      index: i,
      xStart: a.x,
      xEnd: a.xEnd,
      headerText: a.text,
      suggestedField: a.field,
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
      let header = detectHeader(lines)

      // Continuation pages often have mangled headers where letterhead text
      // merges into the header row (e.g. "HDFC BANKDateNarration"). When the
      // inherited columns have MORE useful fields, prefer them — a 4-field
      // mangled header should not replace a clean 6-field inherited one.
      if (header && previousColumns) {
        const newFieldCount = header.columns.filter(c => c.suggestedField != null).length
        const inheritedFieldCount = previousColumns.filter(c => c.suggestedField != null).length
        if (inheritedFieldCount > newFieldCount) {
          header = null
        }
      }

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
      // Headerless fallback: scan raw lines for [Date][Text][Amount] sequences.
      const allPageLines = input.pages
        .filter(p => p.items.length > 0)
        .map(p => ({ pageNumber: p.pageNumber, lines: buildLines(p.items) }))
      const fallbackTables = extractWithoutHeader(allPageLines)
      if (fallbackTables && fallbackTables.some(t => t.rows.length > 0)) {
        warnings.push({ code: 'HEADERLESS_FALLBACK', message: 'no tabular header found; using sequence-based extraction' })
        const totalFallbackRows = fallbackTables.reduce((s, t) => s + t.rows.length, 0)
        ctx.log.info('tables_detected', {
          tables: fallbackTables.length,
          rows: totalFallbackRows,
          inheritedHeaders: 0,
          headerless: true,
        })
        return {
          data: { tables: fallbackTables },
          confidence: candidatePages === 0 ? 0 : 0.6,
          warnings,
        }
      }
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
