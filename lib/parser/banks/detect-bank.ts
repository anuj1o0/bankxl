/**
 * lib/parser/banks/detect-bank.ts — bank detection stage.
 *
 * Identifies the issuing bank from page text: registered name patterns
 * (strong signal — banks letterhead every page) and IFSC codes printed in
 * account details (fallback). An unknown bank is a WARNING, not an error:
 * the generic pipeline parses conventional layouts without bank rules, and
 * the validator decides whether the result is trustworthy.
 *
 * Scans only the first pages (SCAN_PAGE_LIMIT): letterhead and account
 * details always sit up front, and description text further in can contain
 * OTHER banks' names (NEFT counterparties), which must not win detection.
 */
import type { ParseContext, PipelineStage, StageResult, StageWarning } from '../core/types'
import type { PdfTextContent } from '../pdf/types'
import { getRegisteredBanks, findByIfscPrefix } from './registry'
import type { BankDetectionResult, BankRules } from './types'

const SCAN_PAGE_LIMIT = 2

/** IFSC shape: 4 letters, a zero, 6 alphanumerics — e.g. HDFC0001234. */
const IFSC_RE = /\b([A-Z]{4})0[A-Z0-9]{6}\b/g

const CONFIDENCE: Record<BankDetectionResult['matchedBy'], number> = {
  'name+ifsc': 1,
  name: 0.85,
  ifsc: 0.7,
  none: 0.3,
}

/** Bank detection stage: PdfTextContent → BankDetectionResult. */
export class BankDetectionStage implements PipelineStage<PdfTextContent, BankDetectionResult> {
  readonly name = 'bank-detection' as const

  async execute(
    input: PdfTextContent,
    ctx: ParseContext
  ): Promise<Omit<StageResult<BankDetectionResult>, 'durationMs' | 'stage'>> {
    const warnings: StageWarning[] = []
    const text = input.pages
      .slice(0, SCAN_PAGE_LIMIT)
      .flatMap(p => p.items.map(i => i.text))
      .join(' ')

    let nameMatch: BankRules | null = null
    for (const bank of getRegisteredBanks()) {
      if (bank.namePatterns.some(re => re.test(text))) {
        nameMatch = bank
        break // registration order is priority order
      }
    }

    let ifscMatch: BankRules | null = null
    for (const m of text.toUpperCase().matchAll(IFSC_RE)) {
      const found = findByIfscPrefix(m[1])
      if (found) {
        ifscMatch = found
        break
      }
    }

    const rules = nameMatch ?? ifscMatch
    const matchedBy: BankDetectionResult['matchedBy'] =
      nameMatch && ifscMatch && nameMatch.bankId === ifscMatch.bankId
        ? 'name+ifsc'
        : nameMatch
          ? 'name'
          : ifscMatch
            ? 'ifsc'
            : 'none'

    if (nameMatch && ifscMatch && nameMatch.bankId !== ifscMatch.bankId) {
      warnings.push({
        code: 'BANK_SIGNAL_CONFLICT',
        message: `letterhead says ${nameMatch.bankName} but IFSC says ${ifscMatch.bankName} — using letterhead`,
      })
    }
    if (!rules) {
      warnings.push({
        code: 'BANK_UNKNOWN',
        message: 'no registered bank matched; continuing with the generic pipeline',
      })
    }

    const result: BankDetectionResult = {
      bankId: rules?.bankId ?? null,
      bankName: rules?.bankName ?? null,
      rules,
      matchedBy,
    }
    ctx.log.info('bank_detected', { bankId: result.bankId, matchedBy })

    return { data: result, confidence: CONFIDENCE[matchedBy], warnings }
  }
}
