/**
 * lib/parser/adapt.ts — canonical → legacy shape adapter.
 *
 * The export engine (lib/excel.ts, lib/formats.ts) speaks the legacy
 * Transaction/StatementMeta shapes defined in lib/gemini.ts. Rather than
 * fork the exporters, the parser adapts its canonical output at the
 * boundary. TRANSITIONAL COUPLING, on purpose: when the Gemini path is
 * deleted at cutover, these type imports move to a neutral module and this
 * adapter is where that one-line change happens.
 */
import type { Transaction, StatementMeta } from '@/lib/gemini'
import type { ParsedTransaction, StatementMetadata } from './core/types'

/** Converts canonical transactions to the exporters' legacy shape. */
export function toLegacyTransactions(transactions: ReadonlyArray<ParsedTransaction>): Transaction[] {
  return transactions.map(tx => ({
    date: tx.date,
    description: tx.description,
    debit: tx.debit,
    credit: tx.credit,
    balance: tx.balance,
    ref_no: tx.reference,
  }))
}

/** Converts canonical metadata to the exporters' legacy shape. */
export function toLegacyMeta(meta: StatementMetadata): StatementMeta {
  return {
    bank_name: meta.bankName,
    account_holder: meta.accountHolder,
    account_no: meta.accountNumber,
    ifsc: meta.ifsc,
    period_from: meta.periodFrom,
    period_to: meta.periodTo,
    opening_balance: meta.openingBalance,
    closing_balance: meta.closingBalance,
    currency: meta.currency,
    total_pages: meta.totalPages,
  }
}
