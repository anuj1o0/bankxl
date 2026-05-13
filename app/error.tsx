'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import Logo from '@/components/Logo'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px' }}>
        <Logo />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <div className="mono" style={{ fontSize: 14, color: 'var(--error)', letterSpacing: 4, marginBottom: 12 }}>500</div>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 28 }}>
            We hit an unexpected error. Please try again — and if it keeps happening, email us with the error code below.
          </p>
          {error.digest && (
            <div className="mono" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, display: 'inline-block' }}>
              Error code: {error.digest}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset} style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              Try again
            </button>
            <Link href="/" style={{ background: 'var(--hover)', border: '1px solid var(--border-strong)', color: 'var(--text)', padding: '12px 24px', borderRadius: 10, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
              Go home
            </Link>
            <Link href="/contact" style={{ background: 'var(--hover)', border: '1px solid var(--border-strong)', color: 'var(--text)', padding: '12px 24px', borderRadius: 10, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
              Email support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
