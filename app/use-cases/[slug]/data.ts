/**
 * app/use-cases/[slug]/data.ts — content for use-case landing pages.
 *
 * Same template shape as /for/[persona], but organized around a task
 * (bank reconciliation, loan processing) rather than a job title — captures
 * searchers who describe what they're doing, not who they are.
 *
 * Priority-order (per SEO strategy §5, Month 3 P1):
 *   /use-cases/bank-reconciliation — "bank reconciliation automation"
 *   /use-cases/loan-processing     — "loan processing bank statement analysis"
 */

export interface UseCasePageData {
  slug: string
  useCase: string             // "Bank Reconciliation"
  useCaseShort: string        // "reconciliation"
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
  painPoints: string[]
  workflows: { title: string; before: string; after: string }[]
  features: { title: string; desc: string; big?: boolean }[]
  testimonial: { text: string; name: string; role: string }
  faqs: { q: string; a: string }[]
  proofPoints: string[]
}

export const USE_CASE_PAGES: Record<string, UseCasePageData> = {

  // ─── Bank Reconciliation ────────────────────────────────────────────────────
  'bank-reconciliation': {
    slug: 'bank-reconciliation',
    useCase: 'Bank Reconciliation',
    useCaseShort: 'reconciliation',
    primaryKeyword: 'bank reconciliation automation',
    metaTitle: 'Bank Reconciliation Automation — Convert Statements to Excel',
    metaDescription: 'Automate the manual data-entry part of bank reconciliation. Convert bank statement PDFs into structured Excel in 15 seconds, ready to match against your books.',
    keywords: [
      'bank reconciliation automation', 'bank reconciliation process', 'automate bank reconciliation',
      'bank statement for reconciliation', 'monthly bank reconciliation tool',
      'bank reconciliation in excel', 'reconcile bank statement to ledger',
    ],
    hero: {
      kicker: 'USE CASE — BANK RECONCILIATION',
      h1Prefix: 'Reconciliation without',
      h1Highlight: 'retyping a single transaction',
      h1Suffix: '.',
      subhead: 'Reconciliation itself — matching bank entries to your books — is the valuable part. Typing 300 rows from a PDF into Excel first is not. BankXL converts any bank statement into structured Excel in 15 seconds so you go straight to matching.',
    },
    proofPoints: ['Used for monthly & year-end reconciliation', '500+ banks supported', 'Free 50 pages/month'],
    painPoints: [
      'Stop retyping every debit and credit from the bank PDF before reconciliation can even start',
      'End the manual scanning for the one missing entry that\'s throwing off your closing balance',
      'Skip re-keying the same statement twice because of a typo the first time',
      'Stop losing reconciliation day to formatting spreadsheets instead of actually matching entries',
    ],
    workflows: [
      { title: 'Monthly bank reconciliation',
        before: 'Download the bank PDF, type every transaction into Excel, then start matching against your ledger.',
        after: 'Upload the PDF, get a formatted Excel with debit/credit split and running balance, and start matching immediately.' },
      { title: 'Finding the mismatch',
        before: 'Manually re-check each row against the ledger to find which transaction is missing or duplicated.',
        after: 'With clean structured data, use Excel formulas (SUMIF, VLOOKUP) to instantly flag entries in the bank statement not present in the ledger, and vice versa.' },
      { title: 'Multi-account reconciliation',
        before: 'Each bank account means a separately-formatted PDF, typed up in a different layout each time.',
        after: 'Every account converts into the same column structure regardless of bank — comparing three accounts side by side is straightforward.' },
      { title: 'Year-end reconciliation',
        before: 'Twelve monthly statements, each typed up separately, then manually combined into an annual view.',
        after: 'Bulk upload all twelve statements — they convert in parallel into consistent columns you can stack into one annual sheet.' },
    ],
    features: [
      { title: 'Structured output ready for formula-based matching', big: true,
        desc: 'Every statement converts into the same column layout — date, narration, debit, credit, running balance, reference number — so you can drop in SUMIF/VLOOKUP/XLOOKUP formulas immediately instead of reformatting first.' },
      { title: 'Bulk conversion for multi-account or multi-month reconciliation', big: true,
        desc: 'Upload up to 50 statements in one batch — ideal for reconciling several bank accounts or a full year of monthly statements at once.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more, all normalized to the same layout.' },
      { title: 'Running balance preserved',
        desc: 'The closing-balance-after-transaction column carries through, so you can verify your reconciliation ties out to the statement\'s printed closing balance.' },
      { title: 'CSV export for accounting software',
        desc: 'Export as CSV to import directly into QuickBooks, Zoho Books, Tally, or your reconciliation tool of choice.' },
      { title: 'Client-safe by design',
        desc: 'Files processed in memory, deleted after conversion. Zero data retention.' },
    ],
    testimonial: {
      text: "Reconciliation used to mean an afternoon of typing before I could even start matching. Now I upload the PDF and I'm reconciling within a minute.",
      name: 'Neha Kapoor',
      role: 'Bookkeeper, Ahmedabad',
    },
    faqs: [
      { q: 'Does BankXL do the reconciliation itself?',
        a: 'No — BankXL converts the bank statement PDF into structured Excel data. You (or your existing reconciliation process/software) still perform the actual matching against your ledger. What BankXL removes is the manual data-entry step that usually comes first.' },
      { q: 'Can I use the output directly in Excel formulas?',
        a: 'Yes. Because every statement converts into the same consistent column layout, you can use standard formulas (SUMIF, VLOOKUP, XLOOKUP) to compare bank data against your ledger without any reformatting.' },
      { q: 'What if I need to reconcile several bank accounts at once?',
        a: 'The Firm plan supports bulk upload of up to 50 statements per batch — useful for reconciling multiple accounts or business units together, each normalized to the same structure.' },
      { q: 'Does the running balance carry over so I can verify against the statement?',
        a: 'Yes — the balance-after-transaction column is preserved in the Excel output, so you can confirm your calculated closing balance matches what the bank printed.' },
      { q: 'Can I export directly to my accounting software?',
        a: 'Yes — export as CSV for tools like QuickBooks or Zoho Books, or as Tally XML for direct Tally Prime/ERP 9 import.' },
      { q: 'Is there a free way to try this?',
        a: 'Yes — 50 free pages every month, no credit card. Convert one of your real statements and see if it fits your reconciliation workflow.' },
    ],
  },

  // ─── Loan Processing ────────────────────────────────────────────────────────
  'loan-processing': {
    slug: 'loan-processing',
    useCase: 'Loan Processing',
    useCaseShort: 'loan processing',
    primaryKeyword: 'loan processing bank statement analysis',
    metaTitle: 'Loan Processing — Bank Statement Analysis Made Fast',
    metaDescription: 'Convert applicant bank statement PDFs into structured Excel for loan processing and underwriting. Every salary credit, EMI and reference number captured automatically.',
    keywords: [
      'loan processing bank statement analysis', 'bank statement analysis for loan approval',
      'loan document conversion', 'bank statement for underwriting', 'loan eligibility bank statement tool',
      'dscr calculation bank statement', 'bank statement pdf to excel for loans',
    ],
    hero: {
      kicker: 'USE CASE — LOAN PROCESSING',
      h1Prefix: 'Underwrite faster with',
      h1Highlight: 'bank data you can actually filter',
      h1Suffix: '.',
      subhead: 'Loan processing runs on bank statement analysis — income stability, existing obligations, average balance. BankXL converts applicant PDFs into structured Excel in 15 seconds, so your underwriting time goes into analysis, not typing.',
    },
    proofPoints: ['Used by DSAs, NBFCs & loan consultants', '500+ banks supported', 'Free 50 pages/month'],
    painPoints: [
      'Stop manually scanning months of statements for salary credits and existing EMI debits',
      'End the guesswork on average monthly balance — get it from real running-balance data',
      'Skip retyping applicant statements before underwriting analysis can even begin',
      'Stop losing loan turnaround time to spreadsheet formatting instead of decisioning',
    ],
    workflows: [
      { title: 'Income verification',
        before: 'Scroll through months of PDFs by eye, looking for consistent salary or business credits.',
        after: 'Convert to Excel, filter credits by narration keyword or employer name, and see a clean month-by-month income trend.' },
      { title: 'Existing obligation (EMI) check',
        before: 'Manually spot same-amount recurring debits across months that look like existing loan EMIs.',
        after: 'Sort debits by amount and date in Excel — recurring same-amount debits stand out immediately for DSCR calculation.' },
      { title: 'Average balance / bounce check',
        before: 'Type out daily or monthly closing balances by hand to compute average balance and spot cheque or ECS bounces.',
        after: 'The running balance column is pre-extracted, so average balance and bounce-flag formulas can be built directly on the converted data.' },
      { title: 'Co-applicant / multi-account cases',
        before: 'Each applicant or account gets typed up separately, slowing down joint or business loan files.',
        after: 'Bulk upload every applicant\'s statements together — each converts in parallel with the same column layout for side-by-side comparison.' },
    ],
    features: [
      { title: 'Every transaction with reference numbers intact', big: true,
        desc: 'UPI, NEFT, IMPS, RTGS and cheque transactions convert with reference numbers and narrations preserved — needed to verify salary credits and flag unusual large transfers during underwriting.' },
      { title: 'Bulk conversion for multi-applicant loan files', big: true,
        desc: 'Upload the primary applicant and co-applicants together — up to 50 files per batch on the Firm plan, each normalized to the same column layout for fast comparison.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'Running balance for average-balance calculations',
        desc: 'The balance-after-transaction column carries through to Excel — the basis for average monthly balance and minimum balance checks.' },
      { title: 'CSV/JSON export for scoring sheets',
        desc: 'Export as CSV or JSON to feed directly into an in-house eligibility scoring spreadsheet or underwriting model.' },
      { title: 'Applicant-safe by design',
        desc: 'Files processed in memory, deleted after conversion. Zero data retention for sensitive financial documents.' },
    ],
    testimonial: {
      text: 'What used to be a full day of manually reading applicant statements is now an hour of reviewing clean Excel sheets — we close loan files noticeably faster.',
      name: 'Vikram Chawla',
      role: 'Loan Consultant (DSA), Mumbai',
    },
    faqs: [
      { q: 'Does BankXL calculate loan eligibility or DSCR for me?',
        a: 'No — BankXL converts and structures the bank statement data. You still apply your own eligibility criteria, DSCR formulas, and underwriting judgment. It removes the hours of manual data entry that usually come before that analysis.' },
      { q: 'Does it capture UPI and NEFT reference numbers for verification?',
        a: 'Yes. Every transaction — UPI, NEFT, IMPS, RTGS, cheque — converts with its reference number and narration intact, often needed to verify the source of large credits during underwriting.' },
      { q: 'Can I process co-applicant or multi-account statements together?',
        a: 'Yes. The Firm plan supports bulk upload of up to 50 statements in one batch, useful for joint-loan or business-loan cases needing several statements compared side by side.' },
      { q: 'Does it work with statements from smaller or regional banks?',
        a: 'Yes — 500+ banks are supported, including regional and small finance banks. If an applicant\'s bank isn\'t recognized yet, email a sample to support@banlxlai.com and we\'ll typically add it within 24 hours.' },
      { q: 'Is applicant financial data kept private?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion — no long-term storage, and data is never stored or shared with third parties.' },
      { q: 'Can I try it on a real applicant statement first?',
        a: 'Yes — the free plan includes 50 pages every month, no credit card, so you can check output quality before relying on it for live loan files.' },
    ],
  },

  // ─── GST Audit ──────────────────────────────────────────────────────────────
  'gst-audit': {
    slug: 'gst-audit',
    useCase: 'GST Audit',
    useCaseShort: 'GST audit',
    primaryKeyword: 'gst audit bank statement',
    metaTitle: 'GST Audit — Bank Statement Analysis Made Fast',
    metaDescription: 'Convert client bank statement PDFs into structured Excel for GST audit and turnover verification. Every UPI, NEFT and cash transaction captured — built for Indian CAs and GST practitioners.',
    keywords: [
      'gst audit bank statement', 'gst audit bank statement analysis', 'bank statement for gst audit',
      'gst turnover verification bank statement', 'bank statement reconciliation for gst',
      'gst registration bank statement requirements', 'bank statement analysis for gst filing',
    ],
    hero: {
      kicker: 'USE CASE — GST AUDIT',
      h1Prefix: 'GST audits run on',
      h1Highlight: 'bank data you can actually filter',
      h1Suffix: '.',
      subhead: 'Cross-checking declared turnover against bank credits means reading months of statements line by line. BankXL converts every client statement into structured Excel in 15 seconds, so GST audit time goes into verification, not data entry.',
    },
    proofPoints: ['Used for GST audits & turnover checks', '500+ banks supported', 'Free 50 pages/month'],
    painPoints: [
      'Stop manually totaling bank credits to cross-check against declared GST turnover',
      'End the page-by-page hunt for cash deposits and unusual credits that don\'t match invoices',
      'Skip retyping a client\'s full-year statement before turnover verification can even start',
      'Stop losing audit-season time to spreadsheet formatting instead of actual reconciliation',
    ],
    workflows: [
      { title: 'Turnover cross-verification',
        before: 'Manually add up every credit entry across 12 months of statements to compare against GSTR-3B/GSTR-9 turnover.',
        after: 'Convert all statements to Excel, filter/sum credits by month, and reconcile against filed returns in minutes.' },
      { title: 'Cash deposit scrutiny',
        before: 'Scroll through pages looking for cash deposits that might indicate unreported sales.',
        after: 'Filter the converted data by narration keywords ("CASH DEP", "CDM") to isolate every cash transaction instantly.' },
      { title: 'Multi-bank-account clients',
        before: 'A client with 3-4 current accounts means 3-4 different PDF formats typed up separately.',
        after: 'Bulk upload all accounts — each converts into the same column structure for a single consolidated turnover view.' },
      { title: 'Input tax credit verification',
        before: 'Manually trace supplier payments across statements to verify ITC claims are backed by actual payments.',
        after: 'Export to Excel or JSON and match debit entries against supplier ledgers using formulas.' },
    ],
    features: [
      { title: 'Every credit captured with reference numbers', big: true,
        desc: 'UPI, NEFT, IMPS, RTGS and cash deposits all convert with amount, date, and reference intact — the exact data you need to reconcile bank credits against GST turnover.' },
      { title: 'Bulk upload for multi-account clients', big: true,
        desc: 'Upload every current account a client operates in one batch — up to 50 files on the Firm plan, each normalized to the same layout for consolidated turnover analysis.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'Excel with color-coded debit/credit',
        desc: 'Instantly separate what you need to verify — credits for turnover, debits for expense/ITC cross-checks — without manual sorting.' },
      { title: 'Full financial year in one batch',
        desc: 'Convert 12 months of statements together instead of one at a time, ready for annual GST audit or GSTR-9C reconciliation.' },
      { title: 'Client-safe by design',
        desc: 'Files processed in memory, deleted after conversion. Zero data retention for sensitive financial records.' },
    ],
    testimonial: {
      text: 'GST audit season used to mean days of manually totaling bank credits per client. Now I convert a year of statements in minutes and go straight to reconciliation.',
      name: 'Rajesh Agarwal',
      role: 'Chartered Accountant, Delhi',
    },
    faqs: [
      { q: 'Does BankXL calculate GST turnover for me?',
        a: 'No — BankXL converts and structures the bank statement data. You still apply your own reconciliation logic against GSTR filings. It removes the manual data-entry step that usually takes the most time before that analysis.' },
      { q: 'Can it help identify cash deposits for scrutiny?',
        a: 'Yes. Once converted to Excel, you can filter by narration keywords like "CASH DEP" or by transaction type to quickly isolate cash transactions across the whole statement.' },
      { q: 'Can I convert a client\'s statements from multiple bank accounts at once?',
        a: 'Yes — the Firm plan supports bulk upload of up to 50 statements per batch, useful for clients operating multiple current accounts.' },
      { q: 'Does it work for a full financial year of statements?',
        a: 'Yes. Upload each month\'s statement (or a combined PDF) and BankXL extracts every transaction — no page limit issues for typical yearly statement sizes.' },
      { q: 'Is client bank data kept confidential during audit season?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion — no long-term storage, and data is never stored or shared with third parties.' },
      { q: 'Can I try it before audit season starts?',
        a: 'Yes — the free plan includes 50 pages every month, no credit card, so you can test accuracy on a real client statement first.' },
    ],
  },

  // ─── Tax Filing ─────────────────────────────────────────────────────────────
  'tax-filing': {
    slug: 'tax-filing',
    useCase: 'Tax Filing',
    useCaseShort: 'tax filing',
    primaryKeyword: 'bank statement tax filing preparation',
    metaTitle: 'Tax Filing — Bank Statement Prep for ITR & GST',
    metaDescription: 'Prepare client bank statements for ITR and GST filing in seconds, not hours. Convert PDFs to Excel with every income and expense line captured — built for Indian tax consultants and CAs.',
    keywords: [
      'bank statement tax filing preparation', 'bank statement for itr filing', 'bank statement for tax filing',
      'income tax bank statement analysis', 'bank statement pdf to excel for itr',
      'tax filing bank statement converter', 'bank statement preparation for income tax',
    ],
    hero: {
      kicker: 'USE CASE — TAX FILING',
      h1Prefix: 'ITR season without the',
      h1Highlight: 'data-entry backlog',
      h1Suffix: '.',
      subhead: 'Every client hands you a stack of bank statement PDFs during filing season. BankXL converts them into clean Excel in 15 seconds, so you can reconcile income against Form 26AS/AIS and file faster — even during peak deadline crunch.',
    },
    proofPoints: ['Built for ITR & GST filing season', '500+ banks supported', 'Free 50 pages/month'],
    painPoints: [
      'Stop manually retyping client statements every filing season',
      'End the scramble to match bank credits against Form 26AS/AIS entries by hand',
      'Skip formatting raw PDF text dumps from generic tools before you can even start',
      'Stop asking clients for "the Excel" when all they have is the PDF',
    ],
    workflows: [
      { title: 'Income reconciliation for ITR',
        before: 'Manually scan bank statements for salary credits, interest income, and other receipts to cross-check against 26AS/AIS.',
        after: 'Convert to Excel, filter credits by narration keyword, and reconcile against 26AS/AIS in minutes.' },
      { title: 'Interest income capture',
        before: 'Search every page for "INT.PD" or "INTEREST CREDIT" entries to total interest income for Schedule OS.',
        after: 'Filter the converted Excel by narration keyword to instantly total interest credits across the year.' },
      { title: 'Multiple clients during peak season',
        before: 'Each of 30+ clients sends a PDF; the team manually enters each one, falling behind during the July crunch.',
        after: 'Bulk upload all client statements in one batch — conversions run in parallel, freeing the team to focus on filing.' },
      { title: 'Responding to a scrutiny notice',
        before: 'Retype a full year of transactions to prepare a response to an income tax notice.',
        after: 'Convert the full year\'s statements to Excel in one pass and prepare your response with structured, verifiable data.' },
    ],
    features: [
      { title: 'Fast turnaround during filing deadlines', big: true,
        desc: 'Convert a full year of statements in 15 seconds per file — critical when ITR and GST deadlines mean dozens of clients need processing in the same week.' },
      { title: 'Bulk conversion for multiple clients', big: true,
        desc: 'Upload up to 50 statements in one batch during peak season. Each processes in parallel so your whole client backlog moves at once.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'CSV export for filing software',
        desc: 'Export as CSV to import directly into ITR filing utilities or tax-prep tools that accept spreadsheet uploads.' },
      { title: 'Clean debit/credit separation',
        desc: 'Every transaction is split into debit and credit columns automatically — makes income and expense categorization for filing much faster.' },
      { title: 'Client-safe by design',
        desc: 'Files processed in memory, deleted after conversion. No data retention, no sharing with third parties.' },
    ],
    testimonial: {
      text: 'During July filing season I had 40+ clients each sending bank PDFs. BankXL let my team process all of them in an afternoon instead of a week.',
      name: 'Sanjay Mehta',
      role: 'Tax Consultant, Pune',
    },
    faqs: [
      { q: 'Can BankXL help reconcile income for ITR filing?',
        a: 'Yes. Converting the statement to Excel gives you a structured view of credits and debits that you can filter and cross-check against Form 26AS/AIS for income reconciliation.' },
      { q: 'Can I process many clients at once during peak season?',
        a: 'Yes. The Firm plan supports bulk upload of up to 50 statements per batch, especially useful during March and July filing crunches.' },
      { q: 'Does it help with GST filing too?',
        a: 'Yes — the same converted Excel works for GST turnover cross-checks. See our GST Audit use-case page for the reconciliation-specific workflow.' },
      { q: 'Does it work for old or scanned statements needed for scrutiny responses?',
        a: 'Yes. Scanned and image-based PDFs, including multi-year historical statements, are supported at 95%+ accuracy.' },
      { q: 'Is client data safe during filing season?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion — no long-term storage, no sharing with third parties.' },
      { q: 'Can I try it before filing season?',
        a: 'Yes — 50 free pages every month, no credit card. Test it on a client statement to confirm accuracy before the season starts.' },
    ],
  },
}

export const ALL_USE_CASE_SLUGS = Object.keys(USE_CASE_PAGES)
