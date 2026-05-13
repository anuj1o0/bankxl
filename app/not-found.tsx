import Link from 'next/link'
import Logo from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px' }}>
        <Logo />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 14, color: 'var(--accent)', letterSpacing: 4, marginBottom: 12 }}>404</div>
          <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>Page not found</h1>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 28 }}>The page you're looking for doesn't exist or has moved.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              Go home
            </Link>
            <Link href="/contact" style={{ background: 'var(--hover)', border: '1px solid var(--border-strong)', color: 'var(--text)', padding: '12px 24px', borderRadius: 10, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
