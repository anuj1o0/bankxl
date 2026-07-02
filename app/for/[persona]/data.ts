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
}

export const ALL_PERSONA_SLUGS = Object.keys(PERSONA_PAGES)
