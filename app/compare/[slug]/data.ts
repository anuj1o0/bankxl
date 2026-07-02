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

}

export const ALL_COMPARE_SLUGS = Object.keys(COMPARE_PAGES)
