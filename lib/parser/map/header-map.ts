/**
 * lib/parser/map/header-map.ts — header mapping stage.
 *
 * Turns each detected table's per-column field SUGGESTIONS (from the
 * lexicon) into one definitive ColumnMapping, resolving the ambiguities a
 * lexicon can't:
 *   - two date-ish columns → transaction date vs value date,
 *   - duplicate balance suggestions → the rightmost wins (running balance
 *     is conventionally the last column),
 *   - single-Amount formats → amount column + Dr/Cr marker column,
 *   - bank-specific header spellings → BankRules.headerOverrides, applied
 *     before generic resolution.
 *
 * A table without a usable date + description + money mapping is dropped
 * with a warning; the stage throws HEADERS_UNRECOGNIZED only when NO table
 * maps.
 */
import { ParserError } from '../core/errors'
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { BankRules } from '../banks/types'
import type { CanonicalField, DetectedTable, TableDetectionOutput } from '../table/types'

/** Definitive column index per canonical field (absent = not present). */
export type ColumnMapping = Partial<Record<CanonicalField, number>>

/** A table whose columns have been definitively mapped. */
export interface MappedTable {
  table: DetectedTable
  mapping: ColumnMapping
}

export interface HeaderMappingInput {
  detection: TableDetectionOutput
  bank: BankRules | null
}

export interface HeaderMappingOutput {
  tables: MappedTable[]
}

/** Same normalization the lexicon uses — bank overrides key on this form. */
function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolves one table's suggestions into a definitive mapping.
 * Exported for direct unit testing.
 */
export function resolveMapping(table: DetectedTable, bank: BankRules | null): ColumnMapping | null {
  const mapping: ColumnMapping = {}

  // Left-to-right; first claim wins except where noted.
  for (const col of table.columns) {
    const override = bank?.headerOverrides?.[normalizeHeader(col.headerText)]
    const field = override ?? col.suggestedField
    if (!field) continue

    if (field === 'date' && mapping.date !== undefined) {
      // Second date-ish column is the value date (HDFC prints Date … Value Dt).
      if (mapping.valueDate === undefined) mapping.valueDate = col.index
      continue
    }
    if (field === 'balance') {
      // Rightmost balance wins: running balance is the last column by
      // convention; an earlier match is usually "Opening Balance" furniture.
      mapping.balance = col.index
      continue
    }
    if (mapping[field] === undefined) mapping[field] = col.index
  }

  const hasMoney =
    mapping.debit !== undefined ||
    mapping.credit !== undefined ||
    mapping.amount !== undefined
  if (mapping.date === undefined || mapping.description === undefined || !hasMoney) {
    return null
  }
  return mapping
}

/** Header mapping stage: TableDetectionOutput (+ bank) → MappedTable[]. */
export class HeaderMappingStage implements PipelineStage<HeaderMappingInput, HeaderMappingOutput> {
  readonly name = 'header-mapping' as const

  async execute(
    input: HeaderMappingInput,
    ctx: ParseContext
  ): Promise<Omit<StageResult<HeaderMappingOutput>, 'durationMs' | 'stage'>> {
    const warnings: StageWarning[] = []
    const mapped: MappedTable[] = []

    for (const table of input.detection.tables) {
      const mapping = resolveMapping(table, input.bank)
      if (!mapping) {
        warnings.push({
          code: 'TABLE_UNMAPPABLE',
          message: `table on page ${table.page} lacks a usable date/description/money mapping`,
          page: table.page,
        })
        continue
      }
      mapped.push({ table, mapping })
    }

    if (mapped.length === 0) {
      throw new ParserError(
        'HEADERS_UNRECOGNIZED',
        'No detected table could be mapped to the transaction schema',
        'header-mapping',
        { tables: input.detection.tables.length }
      )
    }

    ctx.log.info('headers_mapped', {
      tables: mapped.length,
      unmappable: input.detection.tables.length - mapped.length,
      bank: input.bank?.bankId ?? null,
    })

    return {
      data: { tables: mapped },
      confidence: mapped.length / input.detection.tables.length,
      warnings,
    }
  }
}
