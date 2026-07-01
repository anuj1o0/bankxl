import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { CONVERT_PAGES, ALL_CONVERT_SLUGS, type ConvertPageData } from './data'
import { resolveSiteUrl } from '@/lib/site-url'

const APP_URL = resolveSiteUrl()

interface Props {
  params: { format: string }
}

export function generateStaticParams() {
  return ALL_CONVERT_SLUGS.map(format => ({ format }))
}

export function generateMetadata({ params }: Props): Metadata {
  const data = CONVERT_PAGES[params.format]
  if (!data) return {}

  const ogTitle = encodeURIComponent(`Bank Statement → ${data.format}`)
  const ogSub = encodeURIComponent(data.hero.subhead.slice(0, 100))

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: { canonical: `/convert/${data.slug}` },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `/convert/${data.slug}`,
      images: [{ url: `/api/og?title=${ogTitle}&sub=${ogSub}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.metaTitle,
      description: data.metaDescription,
    },
  }
}

/* ─── Icons (SVG inline, inherit currentColor) ────────────────────────────── */
const I = {
  check:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrow:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  upload:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z"/></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

const STEP_ICONS = [I.upload, I.sparkles, I.download]

export default function ConvertPage({ params }: Props) {
  const data = CONVERT_PAGES[params.format]
  if (!data) notFound()

  // ─── Structured data (breadcrumb, FAQ, HowTo, SoftwareApplication) ────────
  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Converters', item: `${APP_URL}/convert/${data.slug}` },
      { '@type': 'ListItem', position: 3, name: `Bank Statement to ${data.format}`, item: `${APP_URL}/convert/${data.slug}` },
    ],
  }

  const faqLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const howToLD = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to convert a bank statement PDF to ${data.format}`,
    description: data.metaDescription,
    totalTime: 'PT1M',
    step: data.steps.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1, name: s.label, text: s.sub,
    })),
  }

  const softwareLD = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `BankXL — Bank Statement to ${data.format} Converter`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    url: `${APP_URL}/convert/${data.slug}`,
    description: data.metaDescription,
    offers: {
      '@type': 'Offer',
      price: data.proOnly ? '499' : '0',
      priceCurrency: 'INR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9', ratingCount: '312', bestRating: '5',
    },
  }

  const shortSlug = data.format.toLowerCase().replace(/[^\w]/g, '')
  const relatedFormats = ALL_CONVERT_SLUGS.filter(s => s !== data.slug)

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLD) }} />

      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <div className="glow-blob" style={{ top: 480, left: -320, background: 'radial-gradient(circle, var(--accent-2-glow) 0%, transparent 70%)' }} />
      <Nav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 32px', position: 'relative' }}>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span aria-hidden>›</span>
          <Link href="/banks" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Converters</Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--text)' }}>Bank Statement to {data.format}</span>
        </nav>

        {/* ─── Hero ────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '6px 16px', fontSize: 11, color: 'var(--accent)', marginBottom: 24, fontFamily: 'DM Mono, monospace', letterSpacing: 1.5 }}>
            <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent)' }} />
            {data.hero.kicker}
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.035em', marginBottom: 22, color: 'var(--text-strong)', maxWidth: 900 }}>
            {data.hero.h1Prefix}{' '}
            <span className="text-gradient">{data.hero.h1Highlight}</span>
            {/* Skip the leading space before punctuation like "." to avoid dangling spaces */}
            {data.hero.h1Suffix.startsWith('.') || data.hero.h1Suffix.startsWith(',') ? '' : ' '}
            {data.hero.h1Suffix}
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 30, maxWidth: 680 }}>
            {data.hero.subhead}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <Link href="/#converter" className="btn-primary">
              Convert your first PDF {I.arrow}
            </Link>
            <Link href="/pricing" className="btn-secondary">See pricing</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
            {data.benefits.map(b => (
              <div key={b} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{I.check}</span>
                {b}
              </div>
            ))}
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              PDF in, {data.format} out — three steps.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }} className="convert-steps">
            {data.steps.map((step, i) => (
              <div key={i} className="card card-hover" style={{ padding: 26, position: 'relative' }}>
                <div className="display" aria-hidden style={{ position: 'absolute', top: 14, right: 18, fontSize: 48, fontWeight: 800, color: 'var(--accent-bg-strong)', lineHeight: 1, letterSpacing: '-0.04em', userSelect: 'none' }}>
                  0{i + 1}
                </div>
                <div style={{ width: 44, height: 44, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--accent)' }}>
                  {STEP_ICONS[i]}
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 6, color: 'var(--text-strong)' }}>{step.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{step.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Sample output preview ──────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>WHAT YOU GET</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)', marginBottom: 8 }}>
              A clean {data.format} file, ready to use.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', maxWidth: 640 }}>
              Every column laid out consistently. No cleanup, no manual re-formatting.
            </p>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </span>
              <span style={{ marginLeft: 8 }}>statement_bankxl.{data.ext}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {data.outputColumns.map(c => (
                      <th key={c} className="mono" style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.outputSample.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                      <td className="mono" style={{ padding: '10px 14px', color: row.debit ? 'var(--error)' : 'var(--text-faint)', textAlign: 'right' }}>{row.debit || '—'}</td>
                      <td className="mono" style={{ padding: '10px 14px', color: row.credit ? 'var(--accent)' : 'var(--text-faint)', textAlign: 'right' }}>{row.credit || '—'}</td>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--text-dim)', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.balance}</td>
                      <td className="mono" style={{ padding: '10px 14px', color: 'var(--text-faint)', textAlign: 'right' }}>—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Feature bento ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 32 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>WHY BANKXL FOR {data.format.toUpperCase()}</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Built for real accounting workflows.
            </h2>
          </div>
          <div className="convert-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {data.features.map(f => (
              <div key={f.title} className="card card-hover" style={{
                padding: f.big ? 26 : 22,
                gridColumn: f.big ? 'span 2' : 'span 1',
                background: f.big ? 'linear-gradient(140deg, var(--accent-bg) 0%, var(--surface) 55%)' : 'var(--surface)',
              }}>
                <div style={{ fontSize: f.big ? 16 : 14.5, fontWeight: 600, marginBottom: 8, color: 'var(--text-strong)' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Personas ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>WHO'S THIS FOR</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Purpose-built for people who spend real time on bank data.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {data.personas.map(p => (
              <div key={p.title} className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: 'var(--text-strong)' }}>{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ ────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>FAQ</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Frequently asked.
            </h2>
          </div>
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

        {/* ─── Related formats + CTA panel ────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{
            position: 'relative', borderRadius: 26, overflow: 'hidden',
            background: 'var(--gradient-panel)', padding: 'clamp(40px, 6vw, 64px) 32px',
            textAlign: 'center', boxShadow: 'var(--shadow-lg)',
          }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div aria-hidden style={{ position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)', width: 560, height: 280, background: 'radial-gradient(ellipse, rgba(0,229,160,0.25), transparent 70%)', filter: 'blur(30px)' }} />
            <div style={{ position: 'relative' }}>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12, color: '#ffffff', lineHeight: 1.1 }}>
                Try it with your own PDF.
              </h2>
              <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.72)', marginBottom: 28, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                50 free pages every month, no credit card. Upgrade only when you actually need more.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/#converter" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#00e5a0', color: '#021511', padding: '15px 30px', borderRadius: 13,
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 12px 36px rgba(0,229,160,0.35)',
                }}>Convert my first PDF {I.arrow}</Link>
                <Link href="/pricing" style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', padding: '15px 30px', borderRadius: 13, fontWeight: 500, fontSize: 15, textDecoration: 'none',
                }}>See pricing</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Related converters ─────────────────────────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 14 }}>OTHER FORMATS</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {relatedFormats.map(slug => {
              const other = CONVERT_PAGES[slug]
              return (
                <Link key={slug} href={`/convert/${slug}`} style={{
                  padding: '10px 18px', borderRadius: 999,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  Bank statement to <strong style={{ color: 'var(--text-strong)' }}>{other.format}</strong>
                </Link>
              )
            })}
            <Link href="/banks" style={{
              padding: '10px 18px', borderRadius: 999,
              background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
              fontSize: 13, color: 'var(--accent)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500,
            }}>
              Browse by bank →
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
