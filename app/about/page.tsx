import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'About',
  description: 'Why we built BankXL — a faster, cheaper bank statement converter for Indian accountants.',
}

export default function About() {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 14 }}>
          We built BankXL because the alternatives were terrible.
        </h1>
        <div style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 18 }}>
            Most bank statement converters were built five years ago and haven't kept up with modern formats. They charge ₹1,000+ per month, choke on Indian formats like SBI's quirky layouts and HDFC's multi-column rows, and store your files for "30 days" by default.
          </p>
          <p style={{ marginBottom: 18 }}>
            We thought: <em>this should be a 15-second job and cost less than a chai a day.</em>
          </p>
          <p style={{ marginBottom: 18 }}>
            So we built BankXL with a purpose-built parsing engine — deterministic, fast, and accurate — and made it stupidly simple: drop a PDF, get an Excel. No setup. No waiting. No "schedule a demo".
          </p>
          <p style={{ marginBottom: 18 }}>
            And because India's CA market needs price-fit — not enterprise pricing — we kept it at <strong>₹299/mo for unlimited</strong>. With a <strong>₹49 day pass</strong> for one-off jobs and a <strong>free tier</strong> that's actually useful (3 conversions/month, no card needed).
          </p>
          <p style={{ marginBottom: 18 }}>
            We don't store your files. We don't train on your data. We don't sell anything to anyone. The only thing we sell is the converted Excel — and even that, we deliver in seconds and forget about.
          </p>
          <p style={{ marginBottom: 32 }}>
            If you're an Indian CA or bookkeeper who's been losing hours to manual data entry — try us. We think you'll like it.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 32, marginBottom: 32 }}>
          {[
            { v: '1,200+', l: 'CAs onboard' },
            { v: '50,000+', l: 'Statements converted' },
            { v: '99.5%', l: 'Avg accuracy' },
            { v: '15s', l: 'Avg conversion' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: 'var(--accent)' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 28, background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))', border: '1px solid var(--accent-border)', borderRadius: 16, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Try it in 30 seconds</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20 }}>3 free conversions/month. No credit card.</p>
          <Link href="/login?signup=true" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--on-accent)', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Get started free →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
