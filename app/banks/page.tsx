import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Supported Banks — SBI, HDFC, ICICI, Axis, Kotak & 500+ More',
  description: 'BankXL converts PDF statements from 500+ banks: SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, Bank of Baroda, IDFC First, IndusInd, Yes Bank, Federal, RBL, HSBC, Barclays & more.',
  alternates: { canonical: '/banks' },
  openGraph: {
    title: 'Every Bank Supported — SBI, HDFC, ICICI, Axis & 500+ Banks',
    description: 'Convert PDF bank statements from any Indian or international bank to Excel, CSV, or Tally XML in seconds.',
    url: '/banks',
  },
}

// Banks that have dedicated SEO landing pages with slug mapping
const BANK_SLUGS: Record<string, string> = {
  'State Bank of India': 'sbi',
  'HDFC Bank': 'hdfc',
  'ICICI Bank': 'icici',
  'Axis Bank': 'axis',
  'Kotak Mahindra Bank': 'kotak',
  'Punjab National Bank': 'pnb',
  'Canara Bank': 'canara',
  'Bank of Baroda': 'bank-of-baroda',
  'IDFC First Bank': 'idfc-first',
  'IndusInd Bank': 'indusind',
  'Yes Bank': 'yes-bank',
  'Federal Bank': 'federal',
}

const PUBLIC_SECTOR = ['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Indian Bank', 'Bank of India', 'Central Bank of India', 'Bank of Maharashtra', 'UCO Bank', 'IDBI Bank', 'Indian Overseas Bank', 'Punjab & Sind Bank']
const PRIVATE_SECTOR = ['HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank', 'IDFC First Bank', 'Federal Bank', 'RBL Bank', 'South Indian Bank', 'Karnataka Bank', 'City Union Bank', 'Karur Vysya Bank', 'Tamilnad Mercantile Bank', 'DCB Bank', 'CSB Bank']
const SMALL_FINANCE = ['AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank', 'Jana Small Finance Bank', 'ESAF Small Finance Bank', 'Suryoday Small Finance Bank', 'Capital Small Finance Bank']
const PAYMENT_BANKS = ['Paytm Payments Bank', 'Airtel Payments Bank', 'India Post Payments Bank', 'Fino Payments Bank', 'Jio Payments Bank']
const FOREIGN = ['HSBC', 'Citibank', 'Standard Chartered', 'DBS Bank', 'Deutsche Bank', 'Bank of America', 'Barclays', 'JP Morgan Chase']
const COOPERATIVE = ['Saraswat Bank', 'Cosmos Bank', 'TJSB Bank', 'Apna Sahakari Bank', 'NKGSB Bank', 'Bharat Co-operative Bank']

const Section = ({ title, banks }: { title: string; banks: string[] }) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: '-0.01em' }}>{title}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
      {banks.map(b => {
        const slug = BANK_SLUGS[b]
        const inner = (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            {b}
            {slug && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>guide →</span>}
          </>
        )
        return slug ? (
          <Link key={b} href={`/banks/${slug}`} style={{ background: 'var(--surface)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            {inner}
          </Link>
        ) : (
          <div key={b} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {inner}
          </div>
        )
      })}
    </div>
  </div>
)

export default function BanksPage() {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 12 }}>
          Every bank. Every format.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 48, maxWidth: 640, lineHeight: 1.6 }}>
          BankXL works with 500+ Indian and international banks. Banks marked with a <span style={{ color: 'var(--accent)' }}>guide →</span> have a dedicated conversion guide. If your bank isn't listed, try it anyway — our AI handles most formats automatically.
        </p>

        <Section title="Public Sector Banks" banks={PUBLIC_SECTOR} />
        <Section title="Private Sector Banks" banks={PRIVATE_SECTOR} />
        <Section title="Small Finance Banks" banks={SMALL_FINANCE} />
        <Section title="Payments Banks" banks={PAYMENT_BANKS} />
        <Section title="Foreign Banks (in India)" banks={FOREIGN} />
        <Section title="Cooperative Banks" banks={COOPERATIVE} />

        <div style={{ marginTop: 56, padding: 28, background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))', border: '1px solid var(--accent-border)', borderRadius: 16, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Bank not listed?</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
            We support most banks even if they're not on this list. Try a free conversion — and if it doesn't work, email us, we'll tune it for your bank within 48 hours.
          </p>
          <Link href="/#converter" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--on-accent)', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Try a free conversion →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
