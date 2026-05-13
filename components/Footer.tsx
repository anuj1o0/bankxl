import Link from 'next/link'
import Logo from './Logo'

export default function Footer() {
  const cols = [
    {
      title: 'Product', links: [
        ['Pricing', '/pricing'],
        ['Supported banks', '/banks'],
        ['Try a sample', '/sample'],
        ['API docs', '/api-docs'],
      ]
    },
    {
      title: 'Company', links: [
        ['About', '/about'],
        ['Contact', '/contact'],
        ['Refund policy', '/refund'],
      ]
    },
    {
      title: 'Legal', links: [
        ['Privacy policy', '/privacy'],
        ['Terms of service', '/terms'],
      ]
    },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 80, padding: '56px 24px 32px', background: 'var(--surface-2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="bxl-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, 1fr)', gap: 40, marginBottom: 40 }}>
          <div>
            <Logo />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.7, maxWidth: 260 }}>
              The fastest way to convert bank statement PDFs into clean, formatted Excel spreadsheets. Built for accountants, by accountants.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>{col.title}</div>
              {col.links.map(([label, href]) => (
                <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', padding: '6px 0' }}>{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} BankXL. All rights reserved.</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
            <span>Made in India</span>
            <span style={{ color: 'var(--text-faint)' }}>•</span>
            <span>Secured by Stripe & Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
