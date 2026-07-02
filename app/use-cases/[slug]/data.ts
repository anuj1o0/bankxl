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
        a: 'Yes. Files are processed in memory and deleted immediately after conversion — no long-term storage, and data is never used to train AI models.' },
      { q: 'Can I try it on a real applicant statement first?',
        a: 'Yes — the free plan includes 50 pages every month, no credit card, so you can check output quality before relying on it for live loan files.' },
    ],
  },
}

export const ALL_USE_CASE_SLUGS = Object.keys(USE_CASE_PAGES)
