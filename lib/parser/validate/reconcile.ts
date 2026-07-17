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

/** Swaps debit↔credit when balance direction disagrees with the assignment. */
function repairDebitCredit(transactions: ParsedTransaction[]): void {
  let prev: number | null = null
  for (const tx of transactions) {
    if (!isUsableAmount(tx.balance)) continue
    if (prev === null) {
      prev = tx.balance
      continue
    }
    const balanceDelta = tx.balance - prev
    const hasOnlyDebit = isUsableAmount(tx.debit) && !isUsableAmount(tx.credit)
    const hasOnlyCredit = !isUsableAmount(tx.debit) && isUsableAmount(tx.credit)

    if (hasOnlyDebit && balanceDelta > 0 && amountsEqual(balanceDelta, tx.debit!)) {
      tx.credit = tx.debit
      tx.debit = null
    } else if (hasOnlyCredit && balanceDelta < 0 && amountsEqual(-balanceDelta, tx.credit!)) {
      tx.debit = tx.credit
      tx.credit = null
    }
    prev = tx.balance
  }
}

export function reconcileBalances(
  transactions: ReadonlyArray<ParsedTransaction>,
  meta: Pick<StatementMetadata, 'openingBalance' | 'closingBalance'>
): ReconciliationResult {
  const forward = runChain(transactions, meta.openingBalance, meta.closingBalance)
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
  const bestScore = Math.max(forwardScore, reverseScore)

  // When reconciliation is imperfect, try repairing debit/credit using
  // balance direction. Covers single-column amounts, wrong-column PDFs,
  // and OCR that loses Dr/Cr markers.
  if (bestScore < 0.95 && transactions.length >= 3) {
    const mutable = transactions.map(tx => ({ ...tx }))
    repairDebitCredit(mutable)
    const repairedFwd = runChain(mutable, meta.openingBalance, meta.closingBalance)
    const repairedRev = runChain([...mutable].reverse(), meta.openingBalance, meta.closingBalance)
    const repairedFwdScore = repairedFwd.checkableLinks === 0 ? -1 : repairedFwd.reconciledLinks / repairedFwd.checkableLinks
    const repairedRevScore = repairedRev.checkableLinks === 0 ? -1 : repairedRev.reconciledLinks / repairedRev.checkableLinks
    const repairedBest = repairedFwdScore >= repairedRevScore ? repairedFwd : repairedRev
    const repairedDir: Exclude<ChainDirection, 'unknown'> = repairedFwdScore >= repairedRevScore ? 'forward' : 'reverse'
    const repairedScore = Math.max(repairedFwdScore, repairedRevScore)
    if (repairedScore > bestScore + 0.02) {
      for (let i = 0; i < transactions.length; i++) {
        const orig = transactions[i] as ParsedTransaction
        orig.debit = mutable[i].debit
        orig.credit = mutable[i].credit
      }
      return pick(repairedBest, repairedDir)
    }
  }

  return reverseScore > forwardScore ? pick(reverse, 'reverse') : pick(forward, 'forward')
}
