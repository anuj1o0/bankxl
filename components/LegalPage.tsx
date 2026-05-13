import Link from 'next/link'
import Nav from './Nav'
import Footer from './Footer'

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 8 }}>{title}</h1>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 40 }}>Last updated: {updated}</div>
        <div style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.75 }} className="legal-body">
          {children}
        </div>
      </article>
      <Footer />
      <style>{`
        .legal-body h2 { font-size: 22px; font-weight: 600; margin-top: 36px; margin-bottom: 12px; color: var(--text); letter-spacing: -0.01em; }
        .legal-body h3 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; color: var(--text); }
        .legal-body p { margin-bottom: 14px; }
        .legal-body ul, .legal-body ol { margin-left: 20px; margin-bottom: 16px; }
        .legal-body li { margin-bottom: 6px; }
        .legal-body a { color: var(--accent); text-decoration: none; }
        .legal-body a:hover { text-decoration: underline; }
        .legal-body strong { color: var(--text); }
      `}</style>
    </div>
  )
}
