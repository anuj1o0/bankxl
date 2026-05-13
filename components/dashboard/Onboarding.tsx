'use client'
import { useEffect, useState } from 'react'

const KEY = 'bxl-onboarding-dismissed-v1'

export default function Onboarding({ name, isFirstUse }: { name?: string; isFirstUse: boolean }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY) : '1'
    setDismissed(stored === '1' || !isFirstUse)
  }, [isFirstUse])

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(KEY, '1')
    setDismissed(true)
  }

  const steps = [
    { num: 1, title: 'Drop your first PDF', desc: 'Any bank statement — SBI, HDFC, ICICI, Axis, Kotak, or 100+ others.' },
    { num: 2, title: 'Pick output format', desc: 'Excel is recommended. Pro users also get CSV, JSON, and Tally XML.' },
    { num: 3, title: 'Click convert', desc: 'AI reads every transaction in 15–25 seconds. Navigate freely while it runs.' },
  ]

  return (
    <div style={{
      marginBottom: 22, padding: 24,
      background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))',
      border: '1px solid var(--accent-border)',
      borderRadius: 14,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }} />
      <button onClick={dismiss} aria-label="Dismiss"
        style={{ position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Welcome to BankXL{name ? `, ${name}` : ''}</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, maxWidth: 520, lineHeight: 1.6 }}>
          You're ready to convert your first bank statement. It takes about 30 seconds. Here's how it works:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {steps.map(s => (
            <div key={s.num} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent-bg-strong)', color: 'var(--accent)',
                  fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono, monospace',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.num}</span>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          💡 Tip: press
          <kbd style={{ fontSize: 10, padding: '1px 6px', background: 'var(--kbd-bg)', borderRadius: 4, fontFamily: 'DM Mono, monospace', border: '1px solid var(--kbd-border)' }}>⌘ K</kbd>
          anywhere to open the command palette
        </div>
      </div>
    </div>
  )
}
