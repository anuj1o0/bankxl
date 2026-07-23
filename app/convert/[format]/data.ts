/**
 * app/convert/[format]/data.ts — content for format-specific landing pages.
 *
 * These 4 pages target the highest-volume "bank statement to X" queries
 * identified in the SEO growth strategy:
 *   • /convert/bank-statement-to-excel  — 2,400 mo searches
 *   • /convert/bank-statement-to-csv    — 720   mo searches
 *   • /convert/bank-statement-to-tally  — 480   mo searches (India goldmine)
 *   • /convert/bank-statement-to-json   — 140   mo searches
 *
 * Each page is statically generated at build time via generateStaticParams.
 */

export interface ConvertPageData {
  slug: string
  format: string
  ext: string
  primaryKeyword: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  hero: {
    kicker: string
    h1Prefix: string
    h1Highlight: string
    h1Suffix: string
    subhead: string
  }
  benefits: string[]              // trust chips under the CTAs
  steps: { label: string; sub: string }[]
  features: { title: string; desc: string; big?: boolean }[]
  personas: { title: string; desc: string }[]
  faqs: { q: string; a: string }[]
  outputColumns: string[]
  outputSample: Array<{
    date: string
    description: string
    debit: string
    credit: string
    balance: string
  }>
  /** Whether this format is Pro-only (locked for free users) */
  proOnly: boolean
}

const SHARED_SAMPLE = [
  { date: '01/04/2025', description: 'NEFT-CR-INFOSYS LTD-SAL APR2025', debit: '',        credit: '85,000.00', balance: '1,35,000.00' },
  { date: '05/04/2025', description: 'EMI-HDFC HOME LOAN-HOUSING LOAN', debit: '32,500.00', credit: '',       balance: '1,02,500.00' },
  { date: '07/04/2025', description: 'NEFT-DR-MAHESH LANDLORD-RENT',    debit: '35,000.00', credit: '',       balance: '67,500.00'   },
  { date: '12/04/2025', description: 'UPI-ZOMATO-zomato@paytm-MUM',     debit: '1,425.05',  credit: '',       balance: '66,074.95'   },
  { date: '15/04/2025', description: 'ATM WDL-HDFC0001-ANDHERI',        debit: '5,000.00',  credit: '',       balance: '61,074.95'   },
]

export const CONVERT_PAGES: Record<string, ConvertPageData> = {

  // ─── Excel (highest volume) ────────────────────────────────────────────────
  'bank-statement-to-excel': {
    slug: 'bank-statement-to-excel',
    format: 'Excel',
    ext: 'xlsx',
    primaryKeyword: 'bank statement to excel',
    metaTitle: 'Bank Statement PDF to Excel Converter — Free, 15 Seconds',
    metaDescription: 'Convert any bank statement PDF to a formatted Excel file (.xlsx) in 15 seconds. Works with SBI, HDFC, ICICI, Axis, Kotak & 500+ banks. Free 50 pages/month — no card needed.',
    keywords: [
      'bank statement to excel', 'convert bank statement to excel',
      'pdf bank statement to excel', 'bank statement pdf to excel converter',
      'bank statement converter to excel', 'pdf to excel bank statement',
      'bank statement excel converter online', 'convert bank statement pdf to xlsx',
    ],
    hero: {
      kicker: 'BANK STATEMENT → EXCEL',
      h1Prefix: 'Bank statement PDF to',
      h1Highlight: 'clean Excel',
      h1Suffix: 'in 15 seconds.',
      subhead: 'Upload any bank statement — printed, scanned or digital. Get a formatted .xlsx with color-coded debits & credits, running balance and a summary sheet. Works with SBI, HDFC, ICICI, Axis, Kotak and 500+ banks worldwide.',
    },
    benefits: ['50 free pages / month', 'No credit card needed', 'Excel opens in seconds'],
    steps: [
      { label: 'Upload your PDF',           sub: 'Drop your bank statement — up to 25 MB, any bank.' },
      { label: 'Extracts every row instantly',    sub: 'Bank, account, period and every single transaction — parsed automatically.' },
      { label: 'Download formatted .xlsx', sub: 'Three sheets: Transactions, Summary, By Type. Auto-filter enabled, headers frozen.' },
    ],
    features: [
      { title: 'CA-grade Excel formatting', big: true,
        desc: 'Debit rows tinted red, credits tinted green. Frozen header, auto-filter, running balance intact. Import straight into your reconciliation workflow — no cleanup.' },
      { title: 'Handles multi-page statements', big: true,
        desc: 'Even 100-page statements with 500+ transactions extract cleanly. Chunked parallel processing under the hood means you get results in under 30 seconds.' },
      { title: 'Summary sheet included',
        desc: 'Total debits, total credits, net flow, transaction count, date range and detected bank — auto-generated alongside your data.' },
      { title: 'Works on scanned PDFs',
        desc: 'Image-based statements from old passbooks? Built-in OCR reads them too, near-perfectly.' },
      { title: 'Password PDFs supported',
        desc: 'Remove the password once with any PDF viewer, then upload. BankXL handles everything after that.' },
      { title: 'Bulk conversion',
        desc: 'Process up to 50 statements in one batch (Pro plan) — they run in the background.' },
    ],
    personas: [
      { title: 'Chartered Accountants',      desc: 'Stop typing SBI, HDFC and ICICI statements into Excel by hand every quarter. Save hours per client.' },
      { title: 'Bookkeepers & CFOs',          desc: 'Get clean data ready to categorise, reconcile or drop into your accounting software.' },
      { title: 'Loan / credit officers',      desc: 'Convert borrower statements to Excel in seconds for cash-flow and debt-service analysis.' },
      { title: 'Anyone doing personal finance', desc: 'Track spending across banks — export, categorise, chart in Excel however you like.' },
    ],
    outputColumns: ['Date', 'Description', 'Debit (Dr)', 'Credit (Cr)', 'Balance', 'Ref / Cheque'],
    outputSample: SHARED_SAMPLE,
    faqs: [
      { q: 'What Excel format do I get?',
        a: 'A modern .xlsx file (Excel 2007+) that opens in Microsoft Excel, Google Sheets, LibreOffice, Numbers and every other spreadsheet tool. Three sheets: Transactions (all rows), Summary (totals and metadata), and By Type (UPI / NEFT / IMPS / ATM / etc.).' },
      { q: 'Which banks does the Excel converter support?',
        a: 'Every major Indian bank — SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, BoB, IDFC, IndusInd, Yes Bank, Federal, RBL, IDBI and 90+ more. International banks (Chase, Bank of America, Wells Fargo, HSBC, DBS, Standard Chartered) are also supported.' },
      { q: 'How accurate is the extraction?',
        a: 'For digitally-generated PDFs, accuracy is typically 99.5%+. For scanned or image-based statements, 95%+ depending on quality. Always review before final use — good practice for any conversion tool.' },
      { q: 'Is my bank statement safe?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion. Nothing is written to disk long-term. Your data is never stored or shared with third parties.' },
      { q: 'Can I convert password-protected bank statement PDFs?',
        a: 'You need to remove the password first — open the PDF in Adobe Reader or any PDF viewer, use File → Print → Save as PDF, then upload the unlocked file. BankXL handles the rest.' },
      { q: 'Do I need to install anything?',
        a: 'No. Everything runs in your browser. No software to install, no Excel plugin, no configuration.' },
      { q: 'What if my statement is 100+ pages?',
        a: 'No problem. BankXL splits large PDFs and processes chunks in parallel. Even 100-page statements finish in under a minute. The Pro plan (₹499/mo) gives you 800 pages per month.' },
    ],
    proOnly: false,
  },

  // ─── CSV ────────────────────────────────────────────────────────────────────
  'bank-statement-to-csv': {
    slug: 'bank-statement-to-csv',
    format: 'CSV',
    ext: 'csv',
    primaryKeyword: 'bank statement to csv',
    metaTitle: 'Bank Statement PDF to CSV Converter — Free',
    metaDescription: 'Convert any bank statement PDF to CSV in 15 seconds. Import straight into QuickBooks, Xero, Zoho Books, or any spreadsheet. 500+ Indian & global banks. Free to try.',
    keywords: [
      'bank statement to csv', 'bank statement pdf to csv',
      'convert bank statement to csv', 'bank statement csv converter',
      'pdf bank statement to csv', 'bank statement to csv online free',
    ],
    hero: {
      kicker: 'BANK STATEMENT → CSV',
      h1Prefix: 'Bank statement PDF to',
      h1Highlight: 'CSV',
      h1Suffix: 'ready for any tool.',
      subhead: 'Get a clean, comma-separated file with one row per transaction — perfect for importing into QuickBooks, Xero, Zoho Books, Vyapar, or any accounting/database tool. 15-second conversion, 500+ banks supported.',
    },
    benefits: ['50 free pages / month', 'Works with any CSV importer', 'UTF-8, no encoding issues'],
    steps: [
      { label: 'Upload your PDF',            sub: 'Any bank statement — SBI, HDFC, ICICI, Axis, Kotak, and 500+ more.' },
      { label: 'Extracts every row instantly',      sub: 'One transaction per row: date, description, debit, credit, balance, reference.' },
      { label: 'Download standard CSV',      sub: 'RFC 4180 compliant, UTF-8 encoded, ready to import anywhere.' },
    ],
    features: [
      { title: 'Import-ready everywhere',   big: true,
        desc: 'CSV is the universal accounting exchange format. Drop it into QuickBooks Online, Xero, Zoho Books, Wave, Vyapar, or any CRM/database. No format conversion required on the receiving side.' },
      { title: 'Standards-compliant output', big: true,
        desc: 'RFC 4180 quoting, UTF-8 with BOM (Excel-friendly), consistent column order, ISO date format. Handles descriptions with commas, quotes and newlines without breaking anything.' },
      { title: 'Every transaction captured', desc: 'Multi-page statements, credit and debit sides, reference numbers — nothing dropped.' },
      { title: 'Numbers ready to sum',      desc: 'Amounts as plain numbers (no commas, no currency symbols) — SUM/VLOOKUP just works.' },
      { title: 'Works on scanned PDFs',     desc: 'Reads scanned/image-based statements too, not just digital ones.' },
      { title: 'Bulk export',                desc: 'Convert dozens of statements at once. Perfect for month-end reconciliation.' },
    ],
    personas: [
      { title: 'QuickBooks & Xero users',    desc: 'Import bank data without opening Excel first. CSV is the fastest path from bank PDF → your accounting software.' },
      { title: 'Developers & analysts',      desc: 'Pipe straight into pandas, R, PowerBI, Tableau or your own SQL warehouse.' },
      { title: 'Finance ops teams',           desc: 'Automated month-end reconciliation workflows that expect CSV.' },
      { title: 'CA firms with mixed tools',  desc: 'One CSV, works everywhere — no format juggling between clients.' },
    ],
    outputColumns: ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Reference'],
    outputSample: SHARED_SAMPLE,
    faqs: [
      { q: 'What does the CSV file look like?',
        a: 'A standard comma-separated file with one row per transaction. First row is the header (Date, Description, Debit, Credit, Balance, Reference). Amounts are plain numbers (no commas, no currency symbols) so you can sum them directly.' },
      { q: 'Can I import this CSV into QuickBooks / Xero / Zoho Books?',
        a: 'Yes. The column layout is compatible with the CSV importers of every major accounting tool. You may need to map columns during import (each tool has its own wizard) but the data itself needs no transformation.' },
      { q: 'What encoding is the CSV file in?',
        a: 'UTF-8 with BOM. This means it opens correctly in Excel, Google Sheets, Numbers, and every modern text editor — no ??? boxes for Indian rupee symbols or non-English descriptions.' },
      { q: 'Do I need Pro to export to CSV?',
        a: 'Yes — CSV, JSON and Tally XML exports are Pro-plan features. Excel is free on every plan (including the free 50 pages/month). Pro is ₹499/month for 800 pages and all four export formats.' },
      { q: 'How does the CSV handle descriptions with commas?',
        a: 'Correctly. All string fields are quoted per RFC 4180, so descriptions like "UPI-ZOMATO, MUM" import cleanly without splitting into extra columns.' },
      { q: 'Is my bank statement safe?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion. Nothing is stored long-term, and your data is never stored or shared.' },
    ],
    proOnly: true,
  },

  // ─── Tally XML (India goldmine) ────────────────────────────────────────────
  'bank-statement-to-tally': {
    slug: 'bank-statement-to-tally',
    format: 'Tally XML',
    ext: 'xml',
    primaryKeyword: 'bank statement to tally',
    metaTitle: 'Bank Statement to Tally XML Converter (Tally Prime Ready) — Free',
    metaDescription: 'Convert bank statement PDFs directly to Tally-import-ready XML. Works with Tally Prime and Tally ERP 9. No manual voucher entry — just Ctrl+I in Tally. 500+ banks supported.',
    keywords: [
      'bank statement to tally', 'bank statement to tally xml',
      'bank statement to tally prime', 'convert bank statement to tally',
      'bank statement to tally erp 9', 'tally bank statement import',
      'auto import bank statement in tally', 'pdf to tally xml',
      'tally xml import from bank pdf',
    ],
    hero: {
      kicker: 'BANK STATEMENT → TALLY XML',
      h1Prefix: 'Bank statement PDF straight into',
      h1Highlight: 'Tally Prime',
      h1Suffix: '.',
      subhead: 'Skip the manual voucher entry. BankXL converts your bank PDF into Tally-import-ready XML — one Ctrl+I in Tally and every transaction lands as a properly formatted receipt or payment voucher. Works with Tally Prime and Tally ERP 9.',
    },
    benefits: ['No manual voucher entry', 'Works with Tally Prime & ERP 9', '15-second conversion'],
    steps: [
      { label: 'Upload your bank PDF',       sub: 'SBI, HDFC, ICICI, Axis, Kotak — any Indian bank statement.' },
      { label: 'Choose Tally XML format',    sub: 'BankXL builds a proper Tally import file with vouchers for each transaction.' },
      { label: 'Import into Tally (Ctrl+I)', sub: 'Gateway of Tally → Import Data → Vouchers → point to the XML. Done.' },
    ],
    features: [
      { title: 'Receipt & payment vouchers auto-created', big: true,
        desc: 'Every credit becomes a Receipt voucher and every debit becomes a Payment voucher, with the correct ledger structure (Bank on one side, ready for you to map counterparty ledgers on the other). No manual voucher creation, no re-typing.' },
      { title: 'Works with Tally Prime & ERP 9',          big: true,
        desc: 'BankXL emits XML in the official Tally schema. Whether your firm uses the latest Tally Prime or is still on Tally ERP 9 for legacy clients, the same XML imports cleanly into both.' },
      { title: 'Preserves reference numbers', desc: 'UPI refs, UTRs and cheque numbers flow through as voucher narrations for audit trails.' },
      { title: 'Correct date format',        desc: 'YYYYMMDD as Tally expects — no import errors from date-format mismatches.' },
      { title: 'Multi-statement friendly',    desc: 'Convert all client statements first, then import each XML into the respective company in Tally.' },
      { title: 'No Tally plugin needed',      desc: 'Uses Tally\'s built-in Import Data feature (Ctrl+I). No third-party TDL or add-on required.' },
    ],
    personas: [
      { title: 'Chartered Accountants',      desc: 'Save 30-60 min per client per statement. Import bank data as vouchers instead of typing them.' },
      { title: 'CA firms with junior articles', desc: 'Cut articles\' bank-entry work from hours to minutes. Free them for higher-value tasks.' },
      { title: 'In-house accountants',        desc: 'Month-end bank reconciliation goes from a day to under an hour.' },
      { title: 'Tax consultants',              desc: 'Process client bank statements at scale during ITR/GST filing season.' },
    ],
    outputColumns: ['Date', 'Voucher Type', 'Amount', 'Bank Ledger', 'Narration (with Ref No)'],
    outputSample: [
      { date: '20250401', description: 'NEFT-CR-INFOSYS LTD-SAL APR2025',    debit: '',           credit: '85,000.00',  balance: 'Receipt' },
      { date: '20250405', description: 'EMI-HDFC HOME LOAN-HOUSING LOAN EMI', debit: '32,500.00',  credit: '',           balance: 'Payment' },
      { date: '20250407', description: 'NEFT-DR-MAHESH LANDLORD-RENT',       debit: '35,000.00',  credit: '',           balance: 'Payment' },
      { date: '20250412', description: 'UPI-ZOMATO-zomato@paytm-MUM',         debit: '1,425.05',   credit: '',           balance: 'Payment' },
      { date: '20250415', description: 'ATM WDL-HDFC0001-ANDHERI',           debit: '5,000.00',   credit: '',           balance: 'Payment' },
    ],
    faqs: [
      { q: 'How do I import BankXL\'s XML into Tally Prime?',
        a: 'Open your company in Tally Prime → Gateway of Tally → Import Data (or press Ctrl+I) → Vouchers → point Tally to the XML file BankXL gave you → confirm. All vouchers land in place.' },
      { q: 'Does it work with Tally ERP 9 too?',
        a: 'Yes. The XML uses the same schema Tally ERP 9 imports understand. Same import steps: Gateway → Import of Data → Vouchers → select the file.' },
      { q: 'What voucher types does BankXL create?',
        a: 'Credits (money in) become Receipt vouchers, and debits (money out) become Payment vouchers. The bank ledger is set automatically; the other side stays as "Suspense" so you can map to the correct counterparty ledger during or after import.' },
      { q: 'Do I have to create ledgers in Tally first?',
        a: 'Only your bank ledger needs to exist beforehand. The counterparty side of each voucher imports as "Suspense" — a single ledger you can then re-tag or bulk-update inside Tally. This is far faster than typing each voucher.' },
      { q: 'Which banks does the Tally converter support?',
        a: 'Every major Indian bank — SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, Union Bank, IDFC First, IndusInd, Yes Bank, Federal and 90+ more.' },
      { q: 'Is Tally XML export free?',
        a: 'It requires the Pro plan (₹499/month for 800 pages). Free users get Excel export. The Pro plan pays for itself on the first client statement you don\'t have to type by hand.' },
      { q: 'Can I use this with online-Tally / cloud-Tally setups?',
        a: 'Yes. Download the XML from BankXL, upload it to whichever machine runs your Tally instance, and import as usual. The XML file is portable and small (usually under 1 MB).' },
    ],
    proOnly: true,
  },

  // ─── JSON (for developers) ─────────────────────────────────────────────────
  'bank-statement-to-json': {
    slug: 'bank-statement-to-json',
    format: 'JSON',
    ext: 'json',
    primaryKeyword: 'bank statement to json',
    metaTitle: 'Bank Statement PDF to JSON Converter — For Developers',
    metaDescription: 'Convert bank statement PDFs into structured JSON for your app, script, or database. Typed schema, every transaction as an object, ready to pipe into pandas, PowerBI, or your API.',
    keywords: [
      'bank statement to json', 'convert bank statement to json',
      'bank statement pdf to json', 'bank statement json api',
      'parse bank statement json', 'bank statement structured data',
    ],
    hero: {
      kicker: 'BANK STATEMENT → JSON',
      h1Prefix: 'Bank statement PDF to',
      h1Highlight: 'structured JSON',
      h1Suffix: '.',
      subhead: 'A typed schema you can trust. Every transaction is a well-formed object with ISO dates, numeric amounts, and normalised fields — ready to pipe into pandas, PowerBI, your API, or any database.',
    },
    benefits: ['Typed schema', 'ISO dates, numeric amounts', 'Ready for pandas / SQL / APIs'],
    steps: [
      { label: 'Upload the PDF',            sub: 'From your app, dashboard, or a manual test — same endpoint.' },
      { label: 'Extracts everything instantly',    sub: 'Statement meta + every transaction, normalised.' },
      { label: 'Download or POST',          sub: 'Get a JSON file, or (Firm plan) use our REST API to skip the browser entirely.' },
    ],
    features: [
      { title: 'Predictable schema',        big: true,
        desc: 'Every response has the same shape: { meta: {...}, transactions: [...] }. Meta includes bank_name, account_no, IFSC, period_from/to, opening/closing balance. Each transaction has date (YYYY-MM-DD), description, debit, credit, balance, ref_no.' },
      { title: 'Numbers are numbers',       big: true,
        desc: 'Amounts are JSON numbers, not strings. Dates are ISO 8601. Nulls where data is genuinely missing. No parsing gymnastics on your side — just JSON.parse() and go.' },
      { title: 'Works with pandas',         desc: 'One line: pd.json_normalize(response["transactions"]) and you\'ve got a DataFrame ready for analysis.' },
      { title: 'REST API available',        desc: 'Firm plan customers get a REST endpoint. POST a PDF, GET JSON back. Perfect for pipelines.' },
      { title: 'Idempotent output',          desc: 'Same PDF in, same JSON out. Great for testing and pipelines.' },
      { title: 'Bulk-friendly',              desc: 'Small file sizes. Batch-process dozens of statements without paginating downloads.' },
    ],
    personas: [
      { title: 'Fintech developers',         desc: 'Skip building your own OCR + parsing pipeline. Get clean, typed transaction data as an API response.' },
      { title: 'Data analysts',              desc: 'Straight into pandas / PowerBI / Tableau. Categorise, aggregate, chart.' },
      { title: 'CA-firm devs',                desc: 'Automate month-end for your firm — pipe JSON into your practice-management software.' },
      { title: 'Lenders & underwriters',      desc: 'Feed transaction data into cash-flow scoring, DSCR calculators, or ML models.' },
    ],
    outputColumns: ['date (ISO)', 'description', 'debit (number)', 'credit (number)', 'balance (number)', 'ref_no'],
    outputSample: SHARED_SAMPLE,
    faqs: [
      { q: 'What does the JSON structure look like?',
        a: '{ "meta": { "bank_name": "HDFC Bank", "account_no": "50100...", "ifsc": "HDFC0001234", "period_from": "2025-04-01", "period_to": "2025-04-30", "opening_balance": 50000, "closing_balance": 61074.95, "currency": "INR" }, "transactions": [ { "date": "2025-04-01", "description": "NEFT-CR-INFOSYS LTD-SAL APR2025", "debit": null, "credit": 85000, "balance": 135000, "ref_no": "N91185..." }, ... ] }' },
      { q: 'Do you have a REST API for this?',
        a: 'Yes. Firm-plan customers get a REST endpoint that accepts a PDF via multipart/form-data and returns JSON. Documented at /api-docs.' },
      { q: 'What about date and number formats?',
        a: 'Dates are ISO 8601 strings (YYYY-MM-DD). Amounts are JSON numbers, not strings. Missing data is null (never empty string, never zero as a placeholder). You can JSON.parse() and use it without preprocessing.' },
      { q: 'Can I use this with pandas / Excel / PowerBI?',
        a: 'Yes. Pandas: pd.json_normalize(data["transactions"]). Excel/PowerBI: import the JSON via Power Query. Any tool that reads JSON works.' },
      { q: 'Is JSON export free?',
        a: 'It requires the Pro plan (₹499/month, 800 pages). Free users get Excel. For high-volume API access, see the Firm plan.' },
    ],
    proOnly: true,
  },
}

export const ALL_CONVERT_SLUGS = Object.keys(CONVERT_PAGES)
