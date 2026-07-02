import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { PERSONA_PAGES, ALL_PERSONA_SLUGS } from './data'
import { resolveSiteUrl } from '@/lib/site-url'

const APP_URL = resolveSiteUrl()

interface Props { params: { persona: string } }

export function generateStaticParams() {
  return ALL_PERSONA_SLUGS.map(persona => ({ persona }))
}

export function generateMetadata({ params }: Props): Metadata {
  const data = PERSONA_PAGES[params.persona]
  if (!data) return {}

  const ogTitle = encodeURIComponent(`BankXL for ${data.persona}`)
  const ogSub = encodeURIComponent(data.hero.subhead.slice(0, 100))

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.keywords,
    alternates: { canonical: `/for/${data.slug}` },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `/for/${data.slug}`,
      images: [{ url: `/api/og?title=${ogTitle}&sub=${ogSub}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: data.metaTitle, description: data.metaDescription },
  }
}

const I = {
  check:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrow:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  x:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  quote:  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h3v3H7v3a3 3 0 0 1-3 3v-3a6 6 0 0 1 3-6zm10 0h3v3h-3v3a3 3 0 0 1-3 3v-3a6 6 0 0 1 3-6z"/></svg>,
}

export default function PersonaPage({ params }: Props) {
  const data = PERSONA_PAGES[params.persona]
  if (!data) notFound()

  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'For', item: `${APP_URL}/for/${data.slug}` },
      { '@type': 'ListItem', position: 3, name: data.persona, item: `${APP_URL}/for/${data.slug}` },
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

  const reviewLD = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@type': 'SoftwareApplication', name: 'BankXL' },
    author: { '@type': 'Person', name: data.testimonial.name },
    reviewBody: data.testimonial.text,
    reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewLD) }} />

      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <div className="glow-blob" style={{ top: 480, left: -320, background: 'radial-gradient(circle, var(--accent-2-glow) 0%, transparent 70%)' }} />
      <Nav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 32px', position: 'relative' }}>

        <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--text)' }}>{data.persona}</span>
        </nav>

        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '6px 16px', fontSize: 11, color: 'var(--accent)', marginBottom: 24, fontFamily: 'DM Mono, monospace', letterSpacing: 1.5 }}>
            <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent)' }} />
            {data.hero.kicker}
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.035em', marginBottom: 22, color: 'var(--text-strong)', maxWidth: 900 }}>
            {data.hero.h1Prefix}{' '}
            <span className="text-gradient">{data.hero.h1Highlight}</span>{' '}
            {data.hero.h1Suffix}
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 30, maxWidth: 680 }}>
            {data.hero.subhead}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <Link href="/#converter" className="btn-primary">Try BankXL free {I.arrow}</Link>
            <Link href="/pricing" className="btn-secondary">See plans</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)' }}>
            {data.proofPoints.map(p => (
              <div key={p} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{I.check}</span>
                {p}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Pain points ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>THE OLD WAY IS BROKEN</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              What {data.personaShort} tell us they want to stop doing.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {data.painPoints.map(p => (
              <div key={p} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, background: 'var(--error-bg)', border: '1px solid var(--error-border)', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', flexShrink: 0, marginTop: 1 }}>{I.x}</span>
                <span style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55 }}>{p}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Before / after workflows ─────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>THE {data.personaShort.toUpperCase()} WORKFLOW WITH BANKXL</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Every scenario you deal with, streamlined.
            </h2>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {data.workflows.map(w => (
              <div key={w.title} className="card" style={{ padding: 22 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 14, color: 'var(--text-strong)' }}>{w.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="workflow-grid">
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--error)', letterSpacing: 1.5, marginBottom: 6 }}>BEFORE</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{w.before}</div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: 1.5, marginBottom: 6 }}>WITH BANKXL</div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{w.after}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Feature bento ────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>WHAT {data.personaShort.toUpperCase()} GET</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Everything a modern practice needs.
            </h2>
          </div>
          <div className="persona-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
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

        {/* ─── Testimonial ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div className="card" style={{
            padding: 'clamp(30px, 4vw, 48px)', borderRadius: 22,
            background: 'linear-gradient(140deg, var(--accent-bg), var(--info-bg))',
            borderColor: 'var(--accent-border)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }} />
            <div style={{ position: 'relative', color: 'var(--accent)', marginBottom: 14 }}>{I.quote}</div>
            <blockquote className="display" style={{ position: 'relative', fontSize: 'clamp(20px, 2.6vw, 26px)', fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.015em', color: 'var(--text-strong)', margin: 0, marginBottom: 20 }}>
              "{data.testimonial.text}"
            </blockquote>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="display" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                {data.testimonial.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{data.testimonial.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.testimonial.role}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 26 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 12 }}>FAQ FOR {data.personaShort.toUpperCase()}</div>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              What {data.personaShort} usually ask.
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

        {/* ─── CTA panel ────────────────────────────────────────────────── */}
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
                Start free. Convert a real client statement.
              </h2>
              <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.72)', marginBottom: 28, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                50 pages every month, forever, no credit card. Upgrade only when your practice needs more.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/#converter" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#00e5a0', color: '#021511', padding: '15px 30px', borderRadius: 13,
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 12px 36px rgba(0,229,160,0.35)',
                }}>Try BankXL free {I.arrow}</Link>
                <Link href="/pricing" style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', padding: '15px 30px', borderRadius: 13, fontWeight: 500, fontSize: 15, textDecoration: 'none',
                }}>See pricing</Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
