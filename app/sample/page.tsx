'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Converter from '@/components/Converter'

export default function SamplePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 14 }}>
          Try BankXL right now.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 32, lineHeight: 1.6 }}>
          Don't have a sample? Use any bank statement PDF you have. We process it in memory and never store anything. Sign in once and you get 3 free conversions / month.
        </p>

        <Converter user={user} />

        <div style={{ marginTop: 40, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>What to expect</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { v: '15s', l: 'Average conversion time' },
              { v: '99.5%', l: 'Accuracy on digital PDFs' },
              { v: '95%+', l: 'Accuracy on scanned PDFs' },
              { v: '4', l: 'Output formats' },
            ].map(s => (
              <div key={s.l}>
                <div className="mono" style={{ fontSize: 22, color: 'var(--accent)', fontWeight: 500 }}>{s.v}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
