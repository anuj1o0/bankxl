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
      title: 'Convert to…', links: [
        ['Excel (.xlsx)', '/convert/bank-statement-to-excel'],
        ['Tally XML', '/convert/bank-statement-to-tally'],
        ['CSV', '/convert/bank-statement-to-csv'],
        ['JSON', '/convert/bank-statement-to-json'],
      ]
    },
    {
      title: 'For', links: [
        ['Chartered Accountants', '/for/chartered-accountants'],
        ['Loan Consultants', '/for/loan-consultants'],
        ['Bank Reconciliation', '/use-cases/bank-reconciliation'],
        ['Blog & guides', '/blog'],
        ['BankXL vs Nanonets', '/compare/bankxl-vs-nanonets'],
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
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 80, padding: '64px 24px 32px', background: 'var(--surface-2)' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div className="bxl-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(4, 1fr)', gap: 36, marginBottom: 48 }}>
          <div>
            <Logo />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.7, maxWidth: 250 }}>
              The fastest way to convert bank statement PDFs into clean, formatted Excel spreadsheets. Built for accountants, by accountants.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 18, padding: '6px 12px', borderRadius: 999, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: 0.5 }}>Zero data retention</span>
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>{col.title}</div>
              {col.links.map(([label, href]) => (
                <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', padding: '6px 0' }}>{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} BankXL. All rights reserved.</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>Made with care in India</span>
            <span style={{ color: 'var(--text-faint)' }}>•</span>
            <span>Payments secured by Razorpay</span>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .bxl-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .bxl-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
