'use client'
import { useEffect, useState } from 'react'

const KEY = 'bxl-onboarding-dismissed-v1'

const STEP_ICONS = [
  <><path key="u" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline key="u2" points="17 8 12 3 7 8"/><line key="u3" x1="12" y1="3" x2="12" y2="15"/></>,
  <><rect key="f" x="3" y="3" width="7" height="7" rx="1"/><rect key="f2" x="14" y="3" width="7" height="7" rx="1"/><rect key="f3" x="3" y="14" width="7" height="7" rx="1"/><rect key="f4" x="14" y="14" width="7" height="7" rx="1"/></>,
  <><polygon key="z" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
]

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
    <div className="anim-fadeup" style={{
      marginBottom: 22, padding: 26,
      background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))',
      border: '1px solid var(--accent-border)',
      borderRadius: 18,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--grid-line) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.6 }} />
      <button onClick={dismiss} aria-label="Dismiss"
        style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <div style={{ position: 'relative' }}>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: 2, marginBottom: 10 }}>GETTING STARTED</div>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text-strong)' }}>
          Welcome to BankXL{name ? `, ${name}` : ''}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 22, maxWidth: 520, lineHeight: 1.65 }}>
          You're 30 seconds away from your first conversion. Here's the whole workflow:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{STEP_ICONS[i]}</svg>
                </span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: 1 }}>STEP {s.num}</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Tip: press
          <kbd style={{ fontSize: 10, padding: '2px 7px', background: 'var(--kbd-bg)', borderRadius: 5, fontFamily: 'DM Mono, monospace', border: '1px solid var(--kbd-border)' }}>⌘ K</kbd>
          anywhere to search and jump around
        </div>
      </div>
    </div>
  )
}
