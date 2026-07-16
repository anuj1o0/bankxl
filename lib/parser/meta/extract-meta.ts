/**
 * lib/parser/meta/extract-meta.ts — statement metadata extraction.
 *
 * Pulls document-level facts from page text: statement period, opening and
 * closing balances, account number, IFSC. Everything is best-effort — a
 * field that can't be found stays null and the pipeline continues — but
 * opening/closing balances are worth real effort because they anchor the
 * validator's balance chain end-to-end.
 */
import { parseAmount } from '@/lib/normalize'
import type { ParseContext, PipelineStage, StageResult, StatementMetadata } from '../core/types'
import type { PdfTextContent } from '../pdf/types'
import { buildLines, coalesceCells } from '../table/lines'
import { parseStatementDate } from '../rows/parse-date'

const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/
const ACCOUNT_RE = /(?:a\/c|account)\s*(?:no|number|#)?\s*[:.]?\s*(\d[\d*xX]{7,})/i
const OPENING_RE = /opening\s+balance\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*(-?[\d,]+\.?\d*(?:\s*(?:dr|cr))?)/i
const CLOSING_RE = /closing\s+balance\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*(-?[\d,]+\.?\d*(?:\s*(?:dr|cr))?)/i
/** Tokens that look like dates, for period-line detection. */
const DATE_TOKEN_RE = /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{2,4}/g

/** Metadata extraction stage: PdfTextContent → StatementMetadata (partial). */
export class MetadataExtractionStage implements PipelineStage<PdfTextContent, StatementMetadata> {
  // Metadata is part of what "bank detection & document understanding"
  // covers in the audit trail; it shares the stage name space deliberately.
  readonly name = 'classification' as const

  async execute(
    input: PdfTextContent,
    ctx: ParseContext
  ): Promise<Omit<StageResult<StatementMetadata>, 'durationMs' | 'stage'>> {
    const meta: StatementMetadata = {
      bankId: null,
      bankName: null,
      accountNumber: null,
      accountHolder: null,
      ifsc: null,
      periodFrom: null,
      periodTo: null,
      openingBalance: null,
      closingBalance: null,
      currency: 'INR',
      totalPages: input.totalPages,
    }

    // Line-by-line scan: metadata lives on labeled lines ("Statement From
    // 01/04/2026 To 30/04/2026"), and line locality keeps a date in one
    // label from being paired with a date in another.
    const lineTexts: string[] = []
    for (const page of input.pages) {
      for (const line of buildLines(page.items)) {
        lineTexts.push(coalesceCells(line).map(c => c.text).join(' '))
      }
    }

    // The account's own IFSC/number live in the LETTERHEAD, but transaction
    // narrations are full of counterparty codes (observed: an Axis IFSC
    // from a NEFT narration reported as the account IFSC on an HDFC
    // statement). Identity fields therefore only scan the top of the
    // document; balances/period keep the full scan (summaries sit at the
    // end).
    const letterheadLimit = Math.min(lineTexts.length, 30)

    for (let li = 0; li < lineTexts.length; li++) {
      const text = lineTexts[li]
      if (li < letterheadLimit) {
        if (meta.ifsc === null) {
          const m = IFSC_RE.exec(text.toUpperCase())
          if (m) meta.ifsc = m[1]
        }
        if (meta.accountNumber === null) {
          const m = ACCOUNT_RE.exec(text)
          if (m) meta.accountNumber = m[1]
        }
      }
      if (meta.openingBalance === null) {
        const m = OPENING_RE.exec(text)
        if (m) meta.openingBalance = parseAmount(m[1])
      }
      if (meta.closingBalance === null) {
        const m = CLOSING_RE.exec(text)
        if (m) meta.closingBalance = parseAmount(m[1])
      }
      if (meta.periodFrom === null && /statement|period|\bfrom\b/i.test(text)) {
        const dates = (text.match(DATE_TOKEN_RE) ?? [])
          .map(d => parseStatementDate(d))
          .filter((d): d is string => d !== null)
        if (dates.length >= 2) {
          meta.periodFrom = dates[0]
          meta.periodTo = dates[1]
        }
      }
    }

    const found = [
      meta.ifsc,
      meta.accountNumber,
      meta.openingBalance,
      meta.closingBalance,
      meta.periodFrom,
    ].filter(v => v !== null).length

    ctx.log.info('metadata_extracted', {
      ifsc: meta.ifsc,
      account: meta.accountNumber !== null,
      opening: meta.openingBalance,
      closing: meta.closingBalance,
      period: meta.periodFrom !== null,
    })

    // Confidence reflects completeness, not correctness — informational.
    return { data: meta, confidence: 0.5 + (found / 5) * 0.5, warnings: [] }
  }
}
