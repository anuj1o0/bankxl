/**
 * lib/parser/validate/reconcile.ts — running-balance chain reconciliation.
 *
 * The strongest correctness signal a bank statement offers: every printed
 * balance must equal the previous balance minus debit plus credit. A chain
 * that closes end-to-end (opening balance → every row → closing balance)
 * is near-proof that every transaction was captured with correct amounts —
 * a missing row, a wrong amount, or a swapped debit/credit all break it.
 *
 * Mechanics:
 *  - Rows without a printed balance carry the expectation forward; the next
 *    printed balance is checked against the accumulated expectation.
 *  - After a break we RESYNC to the printed balance, so one bad row costs
 *    exactly one break instead of cascading down the statement.
 *  - Some banks print newest-first: reconciliation runs in both directions
 *    and reports whichever closes better.
 */
import { amountsEqual, isUsableAmount } from '../core/money'
import type { ParsedTransaction, StatementMetadata } from '../core/types'
import type { BalanceBreak, ChainDirection, ReconciliationResult } from './types'

interface DirectionRun {
  checkableLinks: number
  reconciledLinks: number
  breaks: BalanceBreak[]
  closingMatched: boolean | null
}

function runChain(
  transactions: ReadonlyArray<ParsedTransaction>,
  openingBalance: number | null,
  closingBalance: number | null
): DirectionRun {
  let prev: number | null = isUsableAmount(openingBalance) ? openingBalance : null
  let checkable = 0
  let reconciled = 0
  const breaks: BalanceBreak[] = []

  transactions.forEach((tx, i) => {
    const delta = (tx.credit ?? 0) - (tx.debit ?? 0)
    if (prev === null) {
      // No anchor yet — the first printed balance becomes it.
      if (isUsableAmount(tx.balance)) prev = tx.balance
      return
    }
    const expected = prev + delta
    if (isUsableAmount(tx.balance)) {
      checkable++
      if (amountsEqual(tx.balance, expected)) {
        reconciled++
      } else {
        breaks.push({ txIndex: i, expected, actual: tx.balance })
      }
      prev = tx.balance // resync: one bad row = one break, not a cascade
    } else {
      prev = expected // carry through unprinted balances
    }
  })

  let closingMatched: boolean | null = null
  if (isUsableAmount(closingBalance) && prev !== null) {
    checkable++
    closingMatched = amountsEqual(closingBalance, prev)
    if (closingMatched) {
      reconciled++
    } else {
      breaks.push({ txIndex: transactions.length, expected: prev, actual: closingBalance })
    }
  }

  return { checkableLinks: checkable, reconciledLinks: reconciled, breaks, closingMatched }
}

/**
 * Reconciles the running-balance chain of a statement.
 *
 * @param transactions - Canonical transactions in extracted order.
 * @param meta - Statement metadata; opening/closing balances join the chain
 *   as first/last links when present.
 * @returns The better of the forward and reverse reconciliations. `fraction`
 *   is 1 and `impossible` true when nothing was checkable (no printed
 *   balances or fewer than the needed anchors).
 */
export function reconcileBalances(
  transactions: ReadonlyArray<ParsedTransaction>,
  meta: Pick<StatementMetadata, 'openingBalance' | 'closingBalance'>
): ReconciliationResult {
  const forward = runChain(transactions, meta.openingBalance, meta.closingBalance)
  // Newest-first statements read as a valid chain when reversed; opening and
  // closing keep their roles relative to TIME, so they swap positions.
  const reverse = runChain([...transactions].reverse(), meta.openingBalance, meta.closingBalance)

  const pick = (run: DirectionRun, direction: Exclude<ChainDirection, 'unknown'>): ReconciliationResult => ({
    checkableLinks: run.checkableLinks,
    reconciledLinks: run.reconciledLinks,
    fraction: run.checkableLinks === 0 ? 1 : run.reconciledLinks / run.checkableLinks,
    direction,
    breaks: run.breaks,
    impossible: run.checkableLinks === 0,
    closingMatched: run.closingMatched,
  })

  if (forward.checkableLinks === 0 && reverse.checkableLinks === 0) {
    return { ...pick(forward, 'forward'), direction: 'unknown' }
  }

  const forwardScore = forward.checkableLinks === 0 ? -1 : forward.reconciledLinks / forward.checkableLinks
  const reverseScore = reverse.checkableLinks === 0 ? -1 : reverse.reconciledLinks / reverse.checkableLinks
  // Ties go forward: chronological order is the overwhelmingly common case.
  return reverseScore > forwardScore ? pick(reverse, 'reverse') : pick(forward, 'forward')
}
