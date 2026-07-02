import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { BLOG_POSTS, ALL_BLOG_SLUGS } from './[slug]/data'

export const metadata: Metadata = {
  title: 'BankXL Blog — Guides for Accountants, CAs and Finance Teams',
  description: 'Practical guides on bank statement conversion, Tally imports, bank reconciliation, and accounting automation for Indian CAs, bookkeepers and firms.',
  alternates: { canonical: '/blog' },
}

export default function BlogIndex() {
  const posts = ALL_BLOG_SLUGS.map(s => BLOG_POSTS[s])
    .sort((a, b) => b.publishedISO.localeCompare(a.publishedISO))

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <Nav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 24px 32px' }}>

        <div style={{ marginBottom: 40, maxWidth: 720 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>BANKXL BLOG</div>
          <h1 className="display" style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 14, color: 'var(--text-strong)' }}>
            Guides for people who work with <span className="text-gradient">bank data</span>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Practical, no-fluff guides on bank statement conversion, Tally imports, and accounting automation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {posts.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card card-hover" style={{
              padding: 24, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: 1.5 }}>
                {p.category.toUpperCase()} · {p.readMinutes} MIN
              </div>
              <div className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text-strong)', lineHeight: 1.25 }}>
                {p.h1}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.65, flex: 1 }}>
                {p.excerpt}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(p.publishedISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
