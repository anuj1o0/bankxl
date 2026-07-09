import type { Transaction, StatementMeta } from './gemini'
import { detectTransactionType } from './gemini'

export function toCSV(transactions: Transaction[]): string {
  const head = ['S.No', 'Date', 'Description', 'Ref No', 'Type', 'Debit', 'Credit', 'Balance']
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = transactions.map((t, i) => [
    i + 1,
    t.date || '',
    t.description || '',
    t.ref_no || '',
    detectTransactionType(t.description || ''),
    t.debit ?? '',
    t.credit ?? '',
    t.balance ?? '',
  ].map(escape).join(','))
  return [head.join(','), ...rows].join('\r\n')
}

export function toJSON(transactions: Transaction[], meta: StatementMeta, warning?: string): string {
  let totalDebit = 0
  let totalCredit = 0
  for (const t of transactions) {
    if (t.debit) totalDebit += t.debit
    if (t.credit) totalCredit += t.credit
  }
  return JSON.stringify({
    statement: meta,
    summary: {
      total_transactions: transactions.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      net_flow: totalCredit - totalDebit,
    },
    ...(warning ? { data_completeness_warning: warning } : {}),
    transactions: transactions.map((t, i) => ({
      sno: i + 1,
      ...t,
      type: detectTransactionType(t.description || ''),
    })),
  }, null, 2)
}

export function toTallyXML(transactions: Transaction[], meta: StatementMeta): string {
  const escape = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

  const ddmmyyyy = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${y}${m}${d}`
  }

  const bankLedger = meta.bank_name ? escape(meta.bank_name) : 'Bank Account'

  const vouchers = transactions.map((t, i) => {
    const isCredit = !!t.credit
    const amount = isCredit ? (t.credit || 0) : (t.debit || 0)
    const date = ddmmyyyy(t.date)
    const narration = escape(t.description || '')
    const ref = t.ref_no ? escape(t.ref_no) : ''
    const voucherType = isCredit ? 'Receipt' : 'Payment'
    return `
  <VOUCHER VCHTYPE="${voucherType}" ACTION="Create" OBJVIEW="Accounting Voucher View">
    <DATE>${date}</DATE>
    <NARRATION>${narration}</NARRATION>
    <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${i + 1}</VOUCHERNUMBER>
    <REFERENCE>${ref}</REFERENCE>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${bankLedger}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${isCredit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
      <AMOUNT>${isCredit ? '-' : ''}${amount.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Suspense A/c</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${isCredit ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
      <AMOUNT>${isCredit ? '' : '-'}${amount.toFixed(2)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
<HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
  <REPORTNAME>Vouchers</REPORTNAME>
  <STATICVARIABLES><SVCURRENTCOMPANY>BankXL Import</SVCURRENTCOMPANY></STATICVARIABLES>
</REQUESTDESC>
<REQUESTDATA>${vouchers}
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>`
}

export const FORMAT_INFO = {
  excel: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
  csv: { mime: 'text/csv; charset=utf-8', ext: 'csv' },
  json: { mime: 'application/json; charset=utf-8', ext: 'json' },
  tally: { mime: 'application/xml; charset=utf-8', ext: 'xml' },
} as const

export type ExportFormat = keyof typeof FORMAT_INFO
