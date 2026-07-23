'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/track'

const SESSION_KEY = 'bankxl_exit_intent_shown'

/**
 * Exit-intent capture for anonymous visitors. When the cursor leaves the top of
 * the viewport (the "I'm about to close this tab / hit the address bar" signal),
 * we surface the lowest-friction offer once per session: the free plan, with the
 * ₹49 day pass as the one-off option. Deliberately gentle — once per session,
 * easy to dismiss, desktop-only, and only armed for logged-out visitors so it
 * never nags existing users.
 *
 * `enabled` is driven by `!user` on the homepage. We also wait a few seconds
 * before arming so it can't fire on an accidental early mouseout.
 */
export default function ExitIntentModal({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    // Once per session, and never on touch devices (no real "exit intent").
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (window.matchMedia('(hover: none)').matches) return

    let armed = false
    const armTimer = setTimeout(() => { armed = true }, 4000)

    const onMouseOut = (e: MouseEvent) => {
      if (!armed) return
      // Only the top edge, and only when actually leaving the window.
      if (e.clientY > 0 || e.relatedTarget) return
      armed = false
      sessionStorage.setItem(SESSION_KEY, '1')
      setOpen(true)
      track('exit_intent_shown', { source: 'homepage' })
    }

    document.addEventListener('mouseout', onMouseOut)
    return () => { clearTimeout(armTimer); document.removeEventListener('mouseout', onMouseOut) }
  }, [enabled])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(2, 8, 16, 0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 420,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '34px 30px 30px', boxShadow: 'var(--shadow-lg)',
          animation: 'pop 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16,
          }}
        >×</button>

        <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8, marginBottom: 12 }}>
          WAIT — 50 PAGES FREE
        </div>
        <h2 id="exit-intent-title" className="display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-strong)', marginBottom: 10, lineHeight: 1.2 }}>
          Convert your first statement free
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 22 }}>
          Get <strong style={{ color: 'var(--text)' }}>50 pages every month</strong>, no credit card needed. Just have a
          one-off job? A <strong style={{ color: 'var(--text)' }}>₹49 day pass</strong> converts up to 100 pages in 24 hours.
        </p>

        <Link
          href="/login?signup=true"
          onClick={() => track('exit_intent_cta_click', { target: 'signup' })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '14px 20px', marginBottom: 10,
            background: 'var(--accent)', color: 'var(--on-accent)',
            borderRadius: 12, fontWeight: 600, fontSize: 14.5, textDecoration: 'none',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          Create free account →
        </Link>
        <Link
          href="/pricing"
          onClick={() => track('exit_intent_cta_click', { target: 'pricing' })}
          style={{
            display: 'block', textAlign: 'center', width: '100%', padding: '11px 20px',
            color: 'var(--text-dim)', fontSize: 13.5, textDecoration: 'none',
          }}
        >
          See pricing & the ₹49 day pass
        </Link>
      </div>
    </div>
  )
}
