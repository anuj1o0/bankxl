import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Contact — BankXL',
  description: 'Get in touch with the BankXL team.',
}

const Card = ({ icon, title, desc, link, action }: any) => (
  <a href={link} style={{ textDecoration: 'none' }}>
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>{desc}</div>
        <div style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'DM Mono, monospace' }}>{action}</div>
      </div>
    </div>
  </a>
)

export default function Contact() {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 14 }}>
          Get in touch
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 32, lineHeight: 1.6 }}>
          We read and reply to every email — usually within a few hours during IST business hours.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          <Card
            icon="📧"
            title="General support"
            desc="For questions, bugs, feature requests."
            link="mailto:support@bankxl.in"
            action="support@bankxl.in →"
          />
          <Card
            icon="🔒"
            title="Privacy & data"
            desc="For GDPR/data deletion and privacy questions."
            link="mailto:privacy@bankxl.in"
            action="privacy@bankxl.in →"
          />
          <Card
            icon="💼"
            title="Sales & enterprise"
            desc="For CA firms with 10+ users or volume pricing."
            link="mailto:sales@bankxl.in"
            action="sales@bankxl.in →"
          />
          <Card
            icon="🐛"
            title="A bank format isn't working?"
            desc="Send us a sample (any redacted statement is fine). We tune it within 48 hours."
            link="mailto:support@bankxl.in?subject=Bank%20format%20issue"
            action="Email a sample →"
          />
        </div>

        <div style={{ marginTop: 40, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Response times</div>
          <ul style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
            <li>Free plan: within 48 hours (working days)</li>
            <li>Pro plan: within 24 hours</li>
            <li>Firm plan: within 4 hours (working days)</li>
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  )
}
