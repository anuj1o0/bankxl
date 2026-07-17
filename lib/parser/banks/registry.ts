/**
 * lib/parser/banks/registry.ts — the bank rules registry.
 *
 * HDFC is the first fully-treated bank (dedicated module). The inline
 * entries below carry DETECTION data only, so statements from these banks
 * get labeled correctly and parse via the generic path; each gets promoted
 * to its own module when real fixtures justify bank-specific rules.
 */
import type { BankRules } from './types'
import { HDFC_RULES } from './hdfc'

const DETECTION_ONLY: BankRules[] = [
  {
    bankId: 'sbi',
    bankName: 'State Bank of India',
    namePatterns: [/\bSTATE\s+BANK\s+OF\s+INDIA\b/i, /\bSBI\b/],
    ifscPrefixes: ['SBIN'],
  },
  {
    bankId: 'icici',
    bankName: 'ICICI Bank',
    namePatterns: [/\bICICI\s+BANK\b/i],
    ifscPrefixes: ['ICIC'],
  },
  {
    bankId: 'axis',
    bankName: 'Axis Bank',
    namePatterns: [/\bAXIS\s+BANK\b/i],
    ifscPrefixes: ['UTIB'],
  },
  {
    bankId: 'kotak',
    bankName: 'Kotak Mahindra Bank',
    namePatterns: [/\bKOTAK\s+MAHINDRA\s+BANK\b/i, /\bKOTAK\b/i],
    ifscPrefixes: ['KKBK'],
  },
  {
    bankId: 'pnb',
    bankName: 'Punjab National Bank',
    namePatterns: [/\bPUNJAB\s+NATIONAL\s+BANK\b/i],
    ifscPrefixes: ['PUNB'],
  },
]

const REGISTRY: ReadonlyArray<BankRules> = [HDFC_RULES, ...DETECTION_ONLY]

/** All registered bank rules, in registration order. */
export function getRegisteredBanks(): ReadonlyArray<BankRules> {
  return REGISTRY
}

/** Looks up rules by IFSC bank code (first 4 letters), case-insensitive. */
export function findByIfscPrefix(prefix: string): BankRules | null {
  const p = prefix.toUpperCase()
  return REGISTRY.find(b => b.ifscPrefixes.includes(p)) ?? null
}
