/**
 * app/for/[persona]/data.ts — content for industry/persona landing pages.
 *
 * Priority-order (per SEO strategy §5, month 1-3 P0):
 *   /for/chartered-accountants — "bank statement converter for ca" (210 mo, KD 10)
 *
 * More personas (ca-firms, auditors, tax-consultants, bookkeepers,
 * loan-consultants, finance-teams) can be added by appending entries below.
 */

export interface PersonaPageData {
  slug: string
  persona: string             // "Chartered Accountants"
  personaShort: string        // "CAs"
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
  painPoints: string[]        // "Stop doing X" bullets
  workflows: { title: string; before: string; after: string }[]
  features: { title: string; desc: string; big?: boolean }[]
  testimonial: { text: string; name: string; role: string }
  faqs: { q: string; a: string }[]
  proofPoints: string[]        // trust-signal chips shown near hero CTA
}

export const PERSONA_PAGES: Record<string, PersonaPageData> = {

  // ─── Chartered Accountants ────────────────────────────────────────────────
  'chartered-accountants': {
    slug: 'chartered-accountants',
    persona: 'Chartered Accountants',
    personaShort: 'CAs',
    primaryKeyword: 'bank statement converter for ca',
    metaTitle: 'Bank Statement Converter for Chartered Accountants',
    metaDescription: 'Purpose-built bank statement PDF-to-Excel converter for Indian CAs. Tally XML export, bulk upload, 500+ banks. Trusted by 1,200+ chartered accountants. Free 50 pages/month.',
    keywords: [
      'bank statement converter for ca', 'bank statement tool for chartered accountants',
      'ca software for bank statements', 'bank statement pdf to excel for accountants',
      'tally bank statement converter for ca', 'bulk bank statement converter for ca',
      'ca firm bank statement software', 'bank statement processing for chartered accountants',
    ],
    hero: {
      kicker: 'BUILT FOR CHARTERED ACCOUNTANTS',
      h1Prefix: 'The bank-statement workflow',
      h1Highlight: '1,200+ Indian CAs',
      h1Suffix: 'trust every day.',
      subhead: 'Stop typing SBI, HDFC and ICICI statements into Excel by hand. BankXL converts any Indian bank PDF into clean Excel or Tally-import-ready XML in 15 seconds — with the accuracy and audit trail your practice needs.',
    },
    proofPoints: ['1,200+ CAs onboard', 'Trusted for FY audits', '500+ banks supported'],
    painPoints: [
      'Stop retyping SBI passbooks row by row for GST reconciliation',
      'Skip the manual voucher entry for every client\'s HDFC statement in Tally',
      'End the "which page did I miss?" checks on 50-page ICICI e-statements',
      'Get juniors off bank data-entry and back on real work',
    ],
    workflows: [
      { title: 'Monthly reconciliation',
        before: 'Download client PDFs → open Excel → type 200-500 rows → fix formatting → reconcile.',
        after: 'Upload PDFs to BankXL → download formatted Excel with color-coded debits/credits + summary sheet → reconcile.' },
      { title: 'Tally import at year-end',
        before: 'Manually create receipt/payment vouchers for every transaction on every bank statement.',
        after: 'Upload → export as Tally XML → import into Tally with Ctrl+I. Vouchers land automatically.' },
      { title: 'GST audit for a new client',
        before: 'Get 12 months × multiple banks × hundreds of rows. Team spends 2-3 days on data entry alone.',
        after: 'Bulk upload all statements → convert in parallel → analyse categorised data on day one.' },
      { title: 'Loan-scoring / DSCR analysis',
        before: 'Type debit-credit patterns into Excel by hand, hope you didn\'t miss a big transaction.',
        after: 'Convert to CSV or JSON. Every UPI, NEFT, IMPS captured with reference numbers intact.' },
    ],
    features: [
      { title: 'Tally XML export (Prime & ERP 9)', big: true,
        desc: 'One-click export produces a Tally-import-ready XML with proper receipt / payment vouchers, correct date format, and reference numbers preserved as narrations. No plugin, no TDL, no third-party add-on — uses Tally\'s built-in Ctrl+I import.' },
      { title: 'Bulk conversion for firms', big: true,
        desc: 'Upload up to 50 statements in one batch. Each runs in parallel, results land in your dashboard as they finish. Perfect for month-end, quarterly audit season, or a new client onboarding.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'Scanned PDFs too',
        desc: 'Old passbook scans, faxed statements, image-based PDFs — AI reads them all at near-perfect accuracy.' },
      { title: 'Team seats',
        desc: 'Firm plan: 5 team seats included. Shared usage, shared history, one subscription.' },
      { title: 'Client-safe by design',
        desc: 'Files processed in memory, deleted after conversion. Zero data retention. Nothing shared with third parties.' },
    ],
    testimonial: {
      text: "I used to spend two hours retyping every client's SBI and HDFC statements. BankXL does it in twenty seconds. Honestly the best money I spend each month.",
      name: 'Rajesh Agarwal',
      role: 'Chartered Accountant, Delhi',
    },
    faqs: [
      { q: 'How is BankXL different from generic PDF-to-Excel tools like iLovePDF or Smallpdf?',
        a: 'Generic tools extract every visible block of text — you get raw tables you then have to re-format for hours. BankXL is purpose-built for bank statements: it detects the bank, splits debit/credit into separate columns, preserves running balance, drops junk rows like "BROUGHT FORWARD" and "OPENING BALANCE", and can export to Tally XML directly. What takes 45 minutes of Excel cleanup with generic tools takes 15 seconds with BankXL.' },
      { q: 'Which Indian banks are supported?',
        a: 'All the ones you work with: SBI, HDFC, ICICI, Axis, Kotak, PNB, Bank of Baroda, Canara, IDFC First, IndusInd, Yes Bank, Federal, RBL, IDBI, AU SFB, and 90+ others. Also international banks (Chase, BoA, Wells Fargo, HSBC, DBS) if you handle NRI or export clients.' },
      { q: 'Can I use it for Tally import?',
        a: 'Yes — this is why most CAs subscribe. BankXL exports Tally XML that imports cleanly into Tally Prime or Tally ERP 9 via the built-in Ctrl+I import. Receipts and payments are created as proper vouchers with reference numbers preserved as narrations. See our /convert/bank-statement-to-tally page for details.' },
      { q: 'Is there a Firm plan for CA offices?',
        a: 'Yes. The Firm plan is ₹4,999/month for 8,000 pages, 5 team seats, bulk upload (up to 50 files at once), and white-label Excel with your firm name in the summary sheet. Perfect for medium firms with articles and partners sharing the workload.' },
      { q: 'What about data privacy? My clients trust me with their bank data.',
        a: 'Files are processed in memory and deleted immediately after conversion. Nothing is written to disk long-term. We don\'t train AI on your data or share it with anyone. If you need extra assurance, we can provide a DPA — email support@banlxlai.com.' },
      { q: 'What if my client\'s statement is password-protected?',
        a: 'Remove the password once using Adobe Reader or any PDF viewer (File → Print → Save as PDF works), then upload. BankXL processes the unlocked file. This is the standard flow — Reserve Bank of India rules mean bank statements often come password-locked, so every CA we work with is used to this step.' },
      { q: 'Can I try it before committing?',
        a: 'Yes. Free plan is 50 pages every month, no credit card. Convert 2-3 typical client statements to see the output quality for yourself before deciding on a paid plan.' },
      { q: 'Is BankXL an ICAI-approved tool?',
        a: 'BankXL is a productivity tool — it converts PDFs to data. ICAI doesn\'t certify converters. What matters for your practice is accuracy (99.5%+ on digital PDFs, 95%+ on scans) and data safety (zero retention). Always review the extracted Excel before finalising audit workpapers, as you would with any input.' },
    ],
  },

  // ─── Auditors ──────────────────────────────────────────────────────────────
  'auditors': {
    slug: 'auditors',
    persona: 'Auditors',
    personaShort: 'Auditors',
    primaryKeyword: 'bank statement tool for auditors',
    metaTitle: 'Bank Statement Converter for Auditors',
    metaDescription: 'Verify and cross-check client bank statements fast. Convert PDFs to structured Excel for audit trails, sampling, and reconciliation. Trusted by audit teams. Free 50 pages/month.',
    keywords: [
      'bank statement tool for auditors', 'bank statement for auditors', 'audit bank statement software',
      'bank statement verification tool', 'bank statement pdf to excel for audit',
      'financial audit bank statement converter', 'audit trail bank statement tool',
    ],
    hero: {
      kicker: 'BUILT FOR AUDITORS',
      h1Prefix: 'Cross-check bank statements',
      h1Highlight: 'without retyping a single row',
      h1Suffix: '.',
      subhead: 'Statutory and internal audits mean verifying hundreds of transactions against ledgers. BankXL converts client bank PDFs into structured Excel in 15 seconds so your team spends time on verification, not data entry.',
    },
    proofPoints: ['Used across statutory & internal audits', '500+ banks supported', 'Zero data retention'],
    painPoints: [
      'Stop manually transcribing bank statements before you can even start sampling',
      'End version-control chaos from multiple team members re-typing the same PDF',
      'Skip re-checking every row for typos introduced during manual entry',
      'Stop losing a day of audit fieldwork time to formatting spreadsheets',
    ],
    workflows: [
      { title: 'Bank confirmation cross-check',
        before: 'Type out the client\'s bank statement by hand to compare against the bank confirmation letter, row by row.',
        after: 'Upload the statement PDF → get a structured Excel → paste into your working paper and compare against the confirmation in minutes.' },
      { title: 'Transaction sampling',
        before: 'Scroll through a PDF, manually noting down transactions that meet your sampling criteria.',
        after: 'Convert to Excel, filter/sort by amount or date, and pull your sample directly with formulas.' },
      { title: 'Multi-entity audit',
        before: 'A client with 5 subsidiaries means 5 different bank formats to manually key in separately.',
        after: 'Bulk upload all 5 statements — each is normalized into the same column structure for consolidated review.' },
      { title: 'Related-party transaction review',
        before: 'Manually scan hundreds of rows looking for transfers to related entities.',
        after: 'Export to Excel or JSON and use formulas or scripts to flag transactions above a threshold or to known counterparties.' },
    ],
    features: [
      { title: 'Structured, audit-ready Excel output', big: true,
        desc: 'Every statement converts into a consistent column layout — date, narration, debit, credit, running balance, reference number — regardless of which bank issued the original PDF. Makes cross-client comparison and workpaper referencing straightforward.' },
      { title: 'Bulk conversion for multi-entity audits', big: true,
        desc: 'Upload up to 50 statements in one batch — ideal for group audits with several subsidiaries or a client with multiple bank accounts.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'Scanned & old statements',
        desc: 'Historical passbook scans and image-based PDFs for multi-year audits are handled at near-perfect accuracy.' },
      { title: 'JSON export for scripted checks',
        desc: 'Export as JSON to run custom Python/Excel-VBA scripts for anomaly detection or related-party flagging.' },
      { title: 'Client-safe by design',
        desc: 'Files processed in memory, deleted after conversion. Zero data retention — important for client confidentiality during fieldwork.' },
    ],
    testimonial: {
      text: 'During a group audit with four subsidiaries, we had all the bank data structured and cross-checkable in under an hour instead of a full day of manual entry.',
      name: 'Priya Nair',
      role: 'Audit Manager, Bengaluru',
    },
    faqs: [
      { q: 'Is BankXL suitable for statutory audits?',
        a: 'Yes. BankXL converts bank statement PDFs into structured data for your working papers — it doesn\'t replace professional judgment or audit procedures. Always verify the extracted data against source documents as part of your standard audit trail.' },
      { q: 'Can I convert statements from multiple subsidiaries at once?',
        a: 'Yes — the Firm plan supports bulk upload of up to 50 statements per batch, each normalized into the same column structure for easy consolidation.' },
      { q: 'Does BankXL retain client bank data?',
        a: 'No. Files are processed in memory and deleted immediately after conversion. Nothing is stored long-term or used to train AI models.' },
      { q: 'Can BankXL detect fraud or anomalies?',
        a: 'BankXL converts and structures data — it doesn\'t perform fraud detection itself. But structured Excel/JSON output makes it easy to apply your own analytical procedures, formulas, or scripts for anomaly detection.' },
      { q: 'What if a client statement is old or scanned?',
        a: 'BankXL handles scanned and image-based PDFs, including older passbook-style statements often needed for multi-year audits, at 95%+ accuracy.' },
      { q: 'Can I try it before using it on a live engagement?',
        a: 'Yes — the free plan includes 50 pages every month, no credit card required, so you can test output quality on a sample statement first.' },
    ],
  },

  // ─── Tax Consultants ────────────────────────────────────────────────────────
  'tax-consultants': {
    slug: 'tax-consultants',
    persona: 'Tax Consultants',
    personaShort: 'Tax Consultants',
    primaryKeyword: 'bank statement converter for tax consultants',
    metaTitle: 'Bank Statement Converter for Tax Consultants',
    metaDescription: 'Prepare client bank statements for ITR filing and GST returns in seconds, not hours. Convert PDFs to Excel or CSV. Built for Indian tax consultants. Free 50 pages/month.',
    keywords: [
      'bank statement converter for tax consultants', 'tax consultant bank statement tool',
      'bank statement for itr filing', 'bank statement pdf to excel for tax filing',
      'gst bank statement converter', 'income tax bank statement analysis tool',
    ],
    hero: {
      kicker: 'BUILT FOR TAX CONSULTANTS',
      h1Prefix: 'ITR and GST season',
      h1Highlight: 'without the data-entry backlog',
      h1Suffix: '.',
      subhead: 'Every client hands you a stack of bank statement PDFs during filing season. BankXL converts them into clean Excel in 15 seconds, so you can reconcile income, categorize transactions, and file faster — even during peak season crunch.',
    },
    proofPoints: ['Built for ITR & GST season', '500+ banks supported', 'Free 50 pages/month'],
    painPoints: [
      'Stop manually re-typing client statements every filing season',
      'End the scramble to reconcile bank credits against declared income by hand',
      'Skip formatting raw PDF text dumps from generic PDF tools before you can even start',
      'Stop asking clients to "just send the Excel" — most only have the PDF',
    ],
    workflows: [
      { title: 'ITR income reconciliation',
        before: 'Manually scan bank statements for salary credits, interest income, and other receipts to cross-check against Form 26AS/AIS.',
        after: 'Convert to Excel, filter credits by narration keywords, and reconcile against 26AS in minutes.' },
      { title: 'GST return preparation',
        before: 'Type out every business transaction from the bank statement to build the turnover working.',
        after: 'Upload → get categorized Excel with debit/credit columns → build your GST turnover working directly from the data.' },
      { title: 'Multiple clients during peak season',
        before: 'Each of 30+ clients sends a PDF; team manually enters each one, falling behind during the March/July crunch.',
        after: 'Bulk upload all client statements in one batch — conversions run in parallel, freeing the team to focus on filing.' },
      { title: 'Cash flow verification for scrutiny cases',
        before: 'Painstakingly retype 12 months of transactions to respond to a tax notice.',
        after: 'Convert the full year\'s statements to Excel in one pass and prepare your response with structured data.' },
    ],
    features: [
      { title: 'Fast turnaround during peak filing season', big: true,
        desc: 'Convert a full year of statements in 15 seconds per file — critical when ITR and GST deadlines mean dozens of clients need processing in the same week.' },
      { title: 'Bulk conversion for multiple clients', big: true,
        desc: 'Upload up to 50 statements in one batch during peak season. Each processes in parallel so your whole client backlog moves at once.' },
      { title: 'Every Indian bank supported',
        desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB, Canara, IDFC, IndusInd, Yes, Federal, RBL, IDBI, AU SFB + 90 more.' },
      { title: 'CSV export for tax software',
        desc: 'Export as CSV to import directly into ITR filing utilities or GST reconciliation tools that accept spreadsheet uploads.' },
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
      { q: 'Is it useful for GST turnover working?',
        a: 'Yes — many tax consultants use BankXL to quickly build the bank-side turnover working for GST returns, especially for clients without proper bookkeeping.' },
      { q: 'Can I process many clients at once during peak season?',
        a: 'Yes. The Firm plan supports bulk upload of up to 50 statements per batch, which is especially useful during March and July filing crunches.' },
      { q: 'Does it work for old or scanned bank statements needed for scrutiny cases?',
        a: 'Yes. Scanned and image-based PDFs, including multi-year historical statements, are supported at 95%+ accuracy.' },
      { q: 'Is client data safe?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion — no long-term storage, no AI training on your data.' },
      { q: 'Can I try it before filing season?',
        a: 'Yes — 50 free pages every month, no credit card. Test it on a client statement to confirm accuracy before the season starts.' },
    ],
  },
}

export const ALL_PERSONA_SLUGS = Object.keys(PERSONA_PAGES)
