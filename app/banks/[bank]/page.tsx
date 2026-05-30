import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { BANK_PAGES, ALL_BANK_SLUGS } from './data'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bankxlai.com'

interface Props {
  params: { bank: string }
}

export function generateStaticParams() {
  return ALL_BANK_SLUGS.map(bank => ({ bank }))
}

export function generateMetadata({ params }: Props): Metadata {
  const data = BANK_PAGES[params.bank]
  if (!data) return {}

  const ogTitle = encodeURIComponent(`${data.shortName} Bank Statement to Excel`)
  const ogSub = encodeURIComponent(`Free converter — no manual entry needed`)

  return {
    title: `${data.name} Statement PDF to Excel Converter — Free | BankXL`,
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: { canonical: `/banks/${params.bank}` },
    openGraph: {
      title: `${data.name} Statement PDF to Excel — BankXL`,
      description: data.metaDescription,
      url: `/banks/${params.bank}`,
      images: [{ url: `/api/og?title=${ogTitle}&sub=${ogSub}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.name} Statement PDF to Excel`,
      description: data.metaDescription,
    },
  }
}

export default function BankPage({ params }: Props) {
  const data = BANK_PAGES[params.bank]
  if (!data) notFound()

  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Supported Banks', item: `${APP_URL}/banks` },
      { '@type': 'ListItem', position: 3, name: data.name, item: `${APP_URL}/banks/${data.slug}` },
    ],
  }

  const faqLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  }

  const howToLD = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to convert ${data.name} statement PDF to Excel`,
    description: `Step-by-step guide to converting your ${data.name} bank statement PDF to Excel using BankXL`,
    totalTime: 'PT1M',
    step: data.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: s,
    })),
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLD) }} />

      <Nav />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px' }}>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <Link href="/banks" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Supported Banks</Link>
          <span>/</span>
          <span style={{ color: 'var(--text)' }}>{data.name}</span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: 'var(--accent)', marginBottom: 20, fontFamily: 'DM Mono, monospace' }}>
            <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%' }} />
            {data.shortName} supported
          </div>

          <h1 style={{ fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16, color: 'var(--text-strong)' }}>
            {data.name} Statement PDF<br />
            to <span style={{ color: 'var(--accent)' }}>Excel in 15 Seconds</span>
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 28, maxWidth: 640 }}>
            Stop manually typing {data.shortName} transactions. Upload your {data.name} statement PDF and get a clean, formatted Excel file instantly — with all transactions, dates, and balances extracted by AI.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/#converter" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
              Convert {data.shortName} Statement Free →
            </Link>
            <Link href="/pricing" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              See pricing
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
            {['50 free pages / month', 'No credit card needed', '99.5% accuracy'].map(item => (
              <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>
            How to convert {data.name} statement to Excel
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {data.steps.map((step, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 12, letterSpacing: 2 }}>STEP {String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>{step}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Supported statement types */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Supported {data.name} statement types
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {data.statementFeatures.map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{f}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Output formats */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Output formats for {data.shortName} statements
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {data.formats.map((f, i) => {
              const icons = ['📊', '📄', '🔧', '📁']
              const labels = ['Best for Excel / accounting', 'Import into any tool', 'For developers / APIs', 'Direct Tally import']
              return (
                <div key={f} style={{ background: i === 0 ? 'var(--accent-bg)' : 'var(--surface)', border: `1px solid ${i === 0 ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{icons[i] || '📄'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{labels[i] || ''}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>
            Frequently asked about {data.shortName} statement conversion
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.faqs.map((faq, i) => (
              <details key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <summary style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {faq.q}
                  <span style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Convert your {data.shortName} statement now
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>
            Free 50 pages every month. No credit card required. Works with all {data.name} account types.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/#converter" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
              Convert Free →
            </Link>
            <Link href="/banks" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              See all supported banks
            </Link>
          </div>
        </section>

        {/* Related banks */}
        <section style={{ marginTop: 48 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-dim)' }}>Also convert statements from:</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_BANK_SLUGS.filter(s => s !== params.bank).slice(0, 8).map(slug => {
              const b = BANK_PAGES[slug]
              return (
                <Link key={slug} href={`/banks/${slug}`} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', textDecoration: 'none' }}>
                  {b.shortName}
                </Link>
              )
            })}
          </div>
        </section>

      </div>
      <Footer />
    </div>
  )
}
