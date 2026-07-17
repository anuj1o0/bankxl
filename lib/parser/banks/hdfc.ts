/**
 * lib/parser/banks/hdfc.ts — HDFC Bank rule module.
 *
 * HDFC digital e-statements (NetBanking "Statement of Account"): classic
 * grid with headers Date / Narration / Chq./Ref.No. / Value Dt /
 * Withdrawal Amt. / Deposit Amt. / Closing Balance — all covered by the
 * generic lexicon, so no header overrides are needed yet. This module
 * exists to (a) detect HDFC reliably and (b) hold HDFC-specific junk-row
 * patterns; grow it against real fixtures, not assumptions.
 */
import type { BankRules } from './types'

export const HDFC_RULES: BankRules = {
  bankId: 'hdfc',
  bankName: 'HDFC Bank',
  namePatterns: [/\bHDFC\s+BANK\b/i],
  ifscPrefixes: ['HDFC'],
  junkRowPatterns: [
    // HDFC statements repeat a "STATEMENT SUMMARY :-" block and print
    // opening-balance marker rows in the table body.
    /statement\s+summary/i,
    /^opening\s+balance\b/i,
  ],
}
