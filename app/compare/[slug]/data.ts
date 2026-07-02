/**
 * app/compare/[slug]/data.ts — comparison pages (vs competitors).
 *
 * Bottom-funnel intent — visitors already know they need a converter, are
 * choosing between BankXL and someone else. Target keywords like
 * "nanonets alternative" (260 mo, KD 18).
 */

export interface ComparePageData {
  slug: string
  competitorName: string
  primaryKeyword: string
  metaTitle: string
  metaDescription: string
  keywords: string[]
  hero: {
    kicker: string
    h1Prefix: string
    h1Suffix: string
    subhead: string
  }
  tldr: string
  featureRows: { feature: string; bankxl: string | boolean; competitor: string | boolean }[]
  pricingRows: { plan: string; bankxl: string; competitor: string }[]
  whenBankxl: string[]        // "Choose BankXL if…"
  whenCompetitor: string[]     // "Choose <competitor> if…"
  faqs: { q: string; a: string }[]
}

export const COMPARE_PAGES: Record<string, ComparePageData> = {

  'bankxl-vs-nanonets': {
    slug: 'bankxl-vs-nanonets',
    competitorName: 'Nanonets',
    primaryKeyword: 'nanonets alternative',
    metaTitle: 'BankXL vs Nanonets — Which Bank Statement Converter Is Better?',
    metaDescription: 'Honest side-by-side comparison of BankXL and Nanonets for bank statement conversion. Pricing, Indian bank support, Tally XML, accuracy, and the right pick for CAs vs enterprise teams.',
    keywords: [
      'nanonets alternative', 'bankxl vs nanonets', 'nanonets bank statement',
      'nanonets pricing', 'best nanonets alternative india',
      'nanonets vs bankxl for ca', 'cheaper alternative to nanonets',
    ],
    hero: {
      kicker: 'BANKXL VS NANONETS',
      h1Prefix: 'Two ways to convert bank statements —',
      h1Suffix: 'compared honestly.',
      subhead: "Nanonets is a powerful, general-purpose document parser. BankXL is a purpose-built bank-statement converter with Indian-market focus and Tally XML export. This page lays out where each wins and which one is right for you.",
    },
    tldr: "Choose BankXL if you're an Indian CA, bookkeeper or small firm converting bank statements to Excel or Tally XML — you'll pay ~10x less and get purpose-built accuracy. Choose Nanonets if you're an enterprise team building an OCR pipeline for many document types (invoices, receipts, contracts) with a developer team to manage templates and integrations.",
    featureRows: [
      { feature: 'Purpose-built for bank statements', bankxl: true,             competitor: 'General-purpose parser (multiple doc types)' },
      { feature: 'Zero-config, works out of the box',  bankxl: true,             competitor: 'Requires model training per document layout' },
      { feature: '500+ Indian banks pre-tuned',        bankxl: true,             competitor: 'Bring-your-own-samples for accuracy' },
      { feature: 'Tally XML export (Indian CAs)',      bankxl: true,             competitor: false },
      { feature: 'Excel with color-coded formatting',   bankxl: true,             competitor: 'Raw output, format yourself' },
      { feature: 'Free tier for individuals',           bankxl: '50 pages/mo',   competitor: 'Limited free credits, then paid' },
      { feature: 'REST API',                             bankxl: 'Firm plan',    competitor: true },
      { feature: 'Multi-document types (invoices, receipts, contracts)', bankxl: false, competitor: true },
      { feature: 'Enterprise SLA',                       bankxl: 'On request',   competitor: true },
      { feature: 'Priced in INR',                        bankxl: true,             competitor: 'USD pricing' },
    ],
    pricingRows: [
      { plan: 'Free / trial',        bankxl: '50 pages / month, free forever',                competitor: '~100 pages free credits, then metered' },
      { plan: 'Individual / starter', bankxl: '₹499/mo (Pro) — 800 pages, all formats',       competitor: 'Starts around $49/mo (~₹4,000)' },
      { plan: 'Firm / team',          bankxl: '₹4,999/mo (Firm) — 8,000 pages, 5 team seats', competitor: '~$249/mo (~₹20,000) for team tier' },
      { plan: 'Enterprise',           bankxl: 'Custom (contact sales)',                       competitor: 'Custom, sales-led' },
    ],
    whenBankxl: [
      "You're an Indian CA, bookkeeper, or CA firm processing SBI/HDFC/ICICI PDFs monthly",
      'You need Tally XML export for direct Tally Prime or ERP 9 import',
      'You want pricing in INR (₹499/mo for Pro is roughly ₹42,000/year less than Nanonets\' starter tier)',
      'You want it to just work, without training a model or setting up templates',
      "You care about privacy — files aren't stored after conversion, no data retention",
    ],
    whenCompetitor: [
      'You process many document types (invoices, receipts, contracts), not just bank statements',
      "You have a developer team ready to train models on your firm's specific layouts",
      'You need advanced workflow orchestration (approval flows, multi-step routing)',
      'You need SOC 2 / HIPAA certifications for enterprise procurement (BankXL: on request)',
      'You already have an integration with Nanonets in your existing stack',
    ],
    faqs: [
      { q: 'What is the actual accuracy difference?',
        a: 'For Indian bank statements specifically, BankXL matches or beats Nanonets on accuracy because our AI is pre-tuned on those bank layouts — you don\'t need to train it. For niche or foreign document layouts you\'d hand-configure Nanonets to a similar level, but that costs setup time.' },
      { q: 'Can BankXL replace Nanonets entirely?',
        a: 'For bank-statement work, yes. For a broader OCR pipeline that also handles invoices, POs, receipts, contracts, and delivery notes — no. Nanonets is a general parser; BankXL is bank-statement-specialist. Some CA firms use BankXL for banks and keep a lighter tool (or manual review) for other docs.' },
      { q: 'Does BankXL have an API?',
        a: 'Yes, on the Firm plan. Same JSON schema for every bank. See /api-docs for details. If you need higher-volume API access, contact us.' },
      { q: 'Does Nanonets support Tally XML?',
        a: 'Not natively. You\'d export from Nanonets as Excel/CSV, then convert to Tally XML yourself or with a middleman tool. BankXL emits Tally XML directly.' },
      { q: 'What about pricing at higher volumes?',
        a: 'Nanonets becomes cheaper than BankXL at extreme scale (~10,000+ pages/day with a negotiated enterprise contract). At everyday CA-firm volumes (up to a few thousand pages/month), BankXL is dramatically cheaper.' },
      { q: 'Is BankXL data private?',
        a: 'Yes. Files are processed in memory and deleted immediately after conversion. Nothing is stored on disk long-term. We don\'t train AI on customer data. Nanonets similarly has strong security posture (SOC 2, HIPAA, GDPR) — the practical difference is BankXL\'s zero-retention policy versus Nanonets\' longer-lived model-training data policy.' },
      { q: 'Can I try BankXL free?',
        a: 'Yes. 50 free pages every month with no credit card, no time limit. Convert a real client statement, see the output, decide.' },
    ],
  },

  'bankxl-vs-docsumo': {
    slug: 'bankxl-vs-docsumo',
    competitorName: 'Docsumo',
    primaryKeyword: 'docsumo alternative',
    metaTitle: 'BankXL vs Docsumo — Which Bank Statement Converter Is Better?',
    metaDescription: 'Side-by-side comparison of BankXL and Docsumo for bank statement conversion. Pricing, Indian bank support, Tally XML, accuracy, and which is right for CA firms vs enterprise teams.',
    keywords: [
      'docsumo alternative', 'bankxl vs docsumo', 'docsumo bank statement',
      'docsumo pricing', 'best docsumo alternative india', 'docsumo vs bankxl for ca',
    ],
    hero: {
      kicker: 'BANKXL VS DOCSUMO',
      h1Prefix: 'Two ways to convert bank statements —',
      h1Suffix: 'compared honestly.',
      subhead: "Docsumo is a document AI platform built for lenders and fintechs processing bank statements, invoices, and IDs at scale. BankXL is a purpose-built bank-statement converter for Indian CAs and firms, with Tally XML export. Here's where each wins.",
    },
    tldr: "Choose BankXL if you're an Indian CA, bookkeeper or small firm that needs fast, affordable Excel/Tally conversion without a sales call. Choose Docsumo if you're a lending or fintech business that needs an enterprise document-AI platform with underwriting workflows, APIs, and analyst dashboards built in.",
    featureRows: [
      { feature: 'Purpose-built for bank statements', bankxl: true,             competitor: 'One of several document types supported' },
      { feature: 'Self-serve signup, no sales call',   bankxl: true,             competitor: 'Enterprise sales-led onboarding' },
      { feature: '500+ Indian banks pre-tuned',        bankxl: true,             competitor: 'Broad bank coverage, lender-focused' },
      { feature: 'Tally XML export (Indian CAs)',      bankxl: true,             competitor: false },
      { feature: 'Underwriting/lending analyst dashboard', bankxl: false,        competitor: true },
      { feature: 'Free tier for individuals',          bankxl: '50 pages/mo',    competitor: 'Demo/trial only, no self-serve free tier' },
      { feature: 'REST API',                            bankxl: 'Firm plan',    competitor: true },
      { feature: 'Multi-document types (KYC, invoices, IDs)', bankxl: false,     competitor: true },
      { feature: 'Priced in INR, transparent per-plan pricing', bankxl: true,    competitor: 'Custom/quote-based pricing' },
    ],
    pricingRows: [
      { plan: 'Free / trial',        bankxl: '50 pages / month, free forever',                competitor: 'Demo call required, no published free tier' },
      { plan: 'Individual / starter', bankxl: '₹499/mo (Pro) — 800 pages, all formats',       competitor: 'Custom quote, typically enterprise-tier pricing' },
      { plan: 'Firm / team',          bankxl: '₹4,999/mo (Firm) — 8,000 pages, 5 team seats', competitor: 'Custom, volume-based contract' },
      { plan: 'Enterprise',           bankxl: 'Custom (contact sales)',                       competitor: 'Custom, sales-led' },
    ],
    whenBankxl: [
      "You're an Indian CA, bookkeeper, or small-to-medium firm converting bank statements to Excel or Tally XML",
      'You want transparent, published pricing you can sign up for without a sales call',
      'You want pricing in INR and don\'t need lending-specific underwriting features',
      'You need Tally XML export for direct Tally Prime or ERP 9 import',
      'You want a quick free trial to check output quality before committing',
    ],
    whenCompetitor: [
      "You're a lender, NBFC, or fintech doing bank-statement-based underwriting at scale",
      'You need built-in analyst dashboards, risk scoring, or lending workflow tooling',
      'You process many document types beyond bank statements (KYC docs, invoices, IDs)',
      'You have budget and need for an enterprise contract with dedicated support/SLAs',
      'You need deep API-first integration into an existing underwriting pipeline',
    ],
    faqs: [
      { q: 'Is Docsumo built for the same use case as BankXL?',
        a: 'Not exactly. Docsumo is a broader document-AI platform most commonly used by lenders for underwriting — bank statement analysis is one of several use cases. BankXL is purpose-built specifically for converting bank statements into Excel/Tally XML for CAs, bookkeepers and firms.' },
      { q: 'Which is cheaper for a small CA firm?',
        a: 'BankXL, in almost every case. BankXL publishes transparent INR pricing (₹499–₹4,999/mo) with self-serve signup. Docsumo\'s pricing is typically custom-quoted and sales-led, which usually means higher minimum spend aimed at lending/enterprise budgets.' },
      { q: 'Does Docsumo support Tally XML export?',
        a: 'Not natively — Docsumo\'s output formats are geared toward JSON/API integration for lending systems, not Tally import. BankXL exports Tally XML directly for Ctrl+I import into Tally Prime or ERP 9.' },
      { q: 'Can I try both before deciding?',
        a: 'BankXL offers immediate self-serve signup with 50 free pages/month. Docsumo typically requires booking a demo call to see the product and get pricing, which takes longer if you just want to test conversion quality.' },
      { q: 'Is Docsumo more accurate than BankXL for bank statements?',
        a: 'For Indian bank statement layouts specifically, BankXL is pre-tuned on 500+ Indian bank formats, so accuracy is comparable or better without any setup. Docsumo\'s accuracy is strong too, but its platform is optimized for lending workflows more broadly, not bank-statement-only accuracy.' },
      { q: 'Is my data safe with either tool?',
        a: 'BankXL processes files in memory and deletes them immediately after conversion — zero retention. Docsumo, being enterprise/lending-focused, offers strong security certifications (SOC 2 etc.) suited to regulated lending environments, but typically retains data per its enterprise data-processing agreements.' },
    ],
  },

  'bankxl-vs-ilovepdf': {
    slug: 'bankxl-vs-ilovepdf',
    competitorName: 'iLovePDF',
    primaryKeyword: 'ilovepdf to excel',
    metaTitle: 'BankXL vs iLovePDF — Which Is Better for Bank Statements?',
    metaDescription: 'BankXL vs iLovePDF compared for converting bank statement PDFs to Excel. See why a purpose-built converter beats a generic PDF tool for bank data — accuracy, formatting, and Tally export.',
    keywords: [
      'ilovepdf to excel', 'ilovepdf bank statement', 'ilovepdf vs bankxl',
      'ilovepdf pdf to excel accuracy', 'bank statement pdf to excel alternative to ilovepdf',
    ],
    hero: {
      kicker: 'BANKXL VS ILOVEPDF',
      h1Prefix: 'A generic PDF tool vs a bank-statement specialist —',
      h1Suffix: "here's the real difference.",
      subhead: "iLovePDF is a great general-purpose PDF-to-Excel converter for things like invoices, tables and reports. But bank statements have a specific structure — debits, credits, running balances, multi-page continuity — that generic tools don't understand. Here's what that means in practice.",
    },
    tldr: "iLovePDF converts what's visually on the page — you still have to manually fix columns, separate debit/credit, and remove junk rows like 'brought forward'. BankXL understands bank statement structure specifically, so the Excel comes out ready to use. If you convert bank statements regularly, BankXL saves hours per week; for occasional one-off table extraction, iLovePDF is a fine free option.",
    featureRows: [
      { feature: 'Understands bank statement structure (debit/credit/balance)', bankxl: true, competitor: false },
      { feature: 'Auto-detects the issuing bank',      bankxl: true,             competitor: false },
      { feature: 'Drops junk rows ("brought forward", "opening balance")', bankxl: true, competitor: false },
      { feature: 'Tally XML export',                    bankxl: true,             competitor: false },
      { feature: 'Works on any PDF table (invoices, reports, etc.)', bankxl: false, competitor: true },
      { feature: 'Free tier',                            bankxl: '50 pages/mo',   competitor: 'Limited free conversions/day' },
      { feature: 'Output requires manual cleanup for bank data', bankxl: false,   competitor: true },
      { feature: 'Bulk / batch conversion',              bankxl: '50 files (Firm plan)', competitor: 'Limited on free tier, paid for more' },
      { feature: 'Priced in INR',                        bankxl: true,             competitor: 'USD/EUR pricing' },
    ],
    pricingRows: [
      { plan: 'Free / trial',        bankxl: '50 pages / month, free forever',           competitor: 'A few free conversions per day' },
      { plan: 'Individual / starter', bankxl: '₹499/mo (Pro) — 800 pages, all formats', competitor: '~$4-9/mo (~₹350-750) for premium tier' },
      { plan: 'Firm / team',          bankxl: '₹4,999/mo (Firm) — 8,000 pages, 5 seats', competitor: 'Business tier, per-seat USD pricing' },
    ],
    whenBankxl: [
      'You convert bank statements specifically and want debit/credit/balance columns done for you',
      'You want Tally XML export for direct accounting import',
      'You process the same bank formats repeatedly (client statements) and want consistent output',
      'You want to skip the 30-45 minutes of manual Excel cleanup generic tools leave you with',
    ],
    whenCompetitor: [
      "You need to convert a one-off PDF that isn't a bank statement (invoice, report, form)",
      'You just need raw text/table extraction with no bank-specific formatting',
      'You want a well-known, general-purpose PDF toolkit (merge, split, compress, convert) for many file types',
    ],
    faqs: [
      { q: 'Can\'t I just use iLovePDF for bank statements too?',
        a: 'You can, but the output is a raw table extraction — you\'ll need to manually split debit/credit into separate columns, remove junk rows like "brought forward" or "opening balance", and fix formatting. That typically takes 30-45 minutes per statement. BankXL does all of that automatically because it understands bank statement structure specifically.' },
      { q: 'Is iLovePDF\'s accuracy worse than BankXL\'s?',
        a: 'For generic PDF-to-Excel extraction, iLovePDF is solid. But it extracts what\'s visually on the page without understanding that it\'s a bank statement — so multi-page statements, running balances, and debit/credit columns often need manual correction. BankXL is purpose-tuned for bank statement layouts specifically.' },
      { q: 'Does iLovePDF support Tally XML export?',
        a: 'No. iLovePDF outputs Excel, Word, PowerPoint and similar formats — not Tally-import-ready XML. BankXL exports Tally XML directly for Ctrl+I import into Tally Prime or ERP 9.' },
      { q: 'Which is cheaper?',
        a: 'For occasional single-file use, iLovePDF\'s free tier may be enough. For regular bank statement conversion (client work, monthly reconciliation), BankXL\'s free tier (50 pages/mo) and paid plans work out cheaper once you account for the time saved not manually formatting outputs.' },
      { q: 'Can I use both?',
        a: 'Sure — many users keep iLovePDF for general PDF tasks (merging, compressing, converting other document types) and use BankXL specifically for bank statements where structure and Tally export matter.' },
      { q: 'Is my bank data safe with iLovePDF?',
        a: 'iLovePDF has its own privacy policy for uploaded files; check their current data retention terms. BankXL processes bank statement files in memory and deletes them immediately after conversion, with zero long-term retention.' },
    ],
  },

}

export const ALL_COMPARE_SLUGS = Object.keys(COMPARE_PAGES)
