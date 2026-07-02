import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { COMPARE_PAGES, ALL_COMPARE_SLUGS } from './data'
import { resolveSiteUrl } from '@/lib/site-url'

const APP_URL = resolveSiteUrl()

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return ALL_COMPARE_SLUGS.map(slug => ({ slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const data = COMPARE_PAGES[params.slug]
  if (!data) return {}

  const ogTitle = encodeURIComponent(`BankXL vs ${data.competitorName}`)
  const ogSub = encodeURIComponent(data.tldr.slice(0, 100))

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: { canonical: `/compare/${data.slug}` },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `/compare/${data.slug}`,
      images: [{ url: `/api/og?title=${ogTitle}&sub=${ogSub}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: data.metaTitle, description: data.metaDescription },
  }
}

const I = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
}

function Cell({ value, isBankxl = false }: { value: string | boolean; isBankxl?: boolean }) {
  if (value === true) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: isBankxl ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 600 }}>
      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 7, background: isBankxl ? 'var(--accent-bg)' : 'var(--surface-2)', alignItems: 'center', justifyContent: 'center' }}>{I.check}</span>
      Yes
    </span>
  )
  if (value === false) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--text-faint)' }}>
      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 7, background: 'var(--surface-2)', alignItems: 'center', justifyContent: 'center' }}>{I.x}</span>
      No
    </span>
  )
  return <span style={{ color: isBankxl ? 'var(--accent)' : 'var(--text-dim)', fontWeight: isBankxl ? 500 : 400 }}>{value}</span>
}

export default function ComparePage({ params }: Props) {
  const data = COMPARE_PAGES[params.slug]
  if (!data) notFound()

  const faqLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: `${APP_URL}/compare/${data.slug}` },
      { '@type': 'ListItem', position: 3, name: `BankXL vs ${data.competitorName}`, item: `${APP_URL}/compare/${data.slug}` },
    ],
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />

      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <Nav />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 32px' }}>

        <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--text)' }}>BankXL vs {data.competitorName}</span>
        </nav>

        {/* Hero */}
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '6px 16px', fontSize: 11, color: 'var(--accent)', marginBottom: 24, letterSpacing: 1.5 }}>
            <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent)' }} />
            {data.hero.kicker}
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(34px, 4.8vw, 54px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20, color: 'var(--text-strong)', maxWidth: 880 }}>
            {data.hero.h1Prefix}{' '}
            <span className="text-gradient">{data.hero.h1Suffix}</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.65, maxWidth: 720 }}>
            {data.hero.subhead}
          </p>
        </section>

        {/* TL;DR box */}
        <div className="card" style={{
          padding: 24, marginBottom: 48, borderRadius: 18,
          background: 'linear-gradient(140deg, var(--accent-bg), var(--info-bg))',
          borderColor: 'var(--accent-border)',
        }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8, marginBottom: 10 }}>TL;DR</div>
          <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>{data.tldr}</p>
        </div>

        {/* Feature comparison */}
        <section style={{ marginBottom: 56 }}>
          <h2 className="display" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--text-strong)' }}>
            Feature by feature
          </h2>
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.5, fontWeight: 500 }}>FEATURE</th>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--accent)', letterSpacing: 1.5, fontWeight: 500 }}>BANKXL</th>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.5, fontWeight: 500 }}>{data.competitorName.toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.featureRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 22px', fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{r.feature}</td>
                      <td style={{ padding: '14px 22px', fontSize: 13.5 }}><Cell value={r.bankxl} isBankxl /></td>
                      <td style={{ padding: '14px 22px', fontSize: 13.5 }}><Cell value={r.competitor} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{ marginBottom: 56 }}>
          <h2 className="display" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--text-strong)' }}>
            Pricing side by side
          </h2>
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.5, fontWeight: 500 }}>PLAN</th>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--accent)', letterSpacing: 1.5, fontWeight: 500 }}>BANKXL</th>
                    <th className="mono" style={{ padding: '14px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.5, fontWeight: 500 }}>{data.competitorName.toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pricingRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 22px', fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{r.plan}</td>
                      <td style={{ padding: '14px 22px', fontSize: 13.5, color: 'var(--accent)', fontWeight: 500 }}>{r.bankxl}</td>
                      <td style={{ padding: '14px 22px', fontSize: 13.5, color: 'var(--text-dim)' }}>{r.competitor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* When to pick each */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="workflow-grid">
            <div className="card" style={{ padding: 24, background: 'linear-gradient(140deg, var(--accent-bg), var(--surface))', borderColor: 'var(--accent-border)' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8, marginBottom: 10 }}>CHOOSE BANKXL IF</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {data.whenBankxl.map(x => (
                  <li key={x} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--accent)', marginTop: 3 }}>{I.check}</span>
                    <span style={{ flex: 1 }}>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.8, marginBottom: 10 }}>CHOOSE {data.competitorName.toUpperCase()} IF</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                {data.whenCompetitor.map(x => (
                  <li key={x} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55 }}>
                    <span style={{ color: 'var(--text-muted)', marginTop: 3 }}>{I.check}</span>
                    <span style={{ flex: 1 }}>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 56 }}>
          <h2 className="display" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 20, color: 'var(--text-strong)' }}>
            Frequently asked
          </h2>
          <div className="card" style={{ padding: '6px 26px' }}>
            {data.faqs.map((faq, i) => (
              <details key={i} style={{ borderBottom: i < data.faqs.length - 1 ? '1px solid var(--border)' : 'none', padding: '18px 0' }}>
                <summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 500, color: 'var(--text)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  {faq.q}
                  <span aria-hidden style={{ fontSize: 20, color: 'var(--text-muted)', flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ marginBottom: 48 }}>
          <div style={{
            position: 'relative', borderRadius: 24, overflow: 'hidden',
            background: 'var(--gradient-panel)', padding: 'clamp(36px, 5vw, 56px) 32px',
            textAlign: 'center', boxShadow: 'var(--shadow-lg)',
          }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div style={{ position: 'relative' }}>
              <h2 className="display" style={{ fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 12, color: '#ffffff' }}>
                Try both. Decide with your own PDFs.
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', marginBottom: 26, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                BankXL is free for 50 pages/month, no credit card. Convert real client statements and compare the output.
              </p>
              <Link href="/#converter" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#00e5a0', color: '#021511', padding: '14px 28px', borderRadius: 13,
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 12px 36px rgba(0,229,160,0.35)',
              }}>Try BankXL free {I.arrow}</Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
