'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Logo from './Logo'
import { ThemeToggle } from './Theme'

const LINKS = [
  { href: '/banks', label: 'Banks' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/sample', label: 'Try sample' },
]

export default function Nav() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sb = createClient()

    // Validate the session against the actual profile in the DB.
    // If the profile is missing (e.g., DB was reset), sign out.
    ;(async () => {
      const { data: { user: authUser } } = await sb.auth.getUser()
      if (!authUser) { setUser(null); return }

      try {
        const res = await fetch('/api/usage', { cache: 'no-store' })
        if (res.status === 401) {
          // Stale JWT — sign out
          await sb.auth.signOut()
          setUser(null)
          return
        }
        if (res.ok) {
          const data = await res.json()
          if (!data.profile) {
            // Auth user exists but no profile (DB reset?) — sign out
            await sb.auth.signOut()
            setUser(null)
            return
          }
        }
        setUser(authUser)
      } catch {
        // Network hiccup — keep user logged in
        setUser(authUser)
      }
    })()

    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Close account dropdown on outside click
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('click', onClick)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick)
    }
  }, [])

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    setUser(null)
    setAccountOpen(false)
    router.push('/')
    router.refresh()
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || '?'
  const userEmail = user?.email || ''

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'var(--backdrop-strong)' : 'var(--backdrop)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="bxl-nav-desktop">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className="bxl-nav-link">{l.label}</Link>
            ))}
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px' }} />
            <ThemeToggle compact />
            <div style={{ width: 6 }} />
            {user ? (
              <div ref={accountRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link href="/dashboard" style={{ fontSize: 13, background: 'var(--accent)', color: 'var(--on-accent)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
                  Dashboard →
                </Link>
                <button onClick={() => setAccountOpen(o => !o)} aria-label="Account menu"
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                    color: 'var(--on-accent)', fontWeight: 600, fontSize: 13,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {userInitial}
                </button>
                {accountOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    background: 'var(--surface-elev)', border: '1px solid var(--border-strong)',
                    borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                    minWidth: 220, padding: 4, zIndex: 70,
                  }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 4 }}>SIGNED IN AS</div>
                      <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
                    </div>
                    <Link href="/dashboard" onClick={() => setAccountOpen(false)} className="bxl-account-item">Dashboard</Link>
                    <Link href="/dashboard/billing" onClick={() => setAccountOpen(false)} className="bxl-account-item">Billing</Link>
                    <Link href="/dashboard/settings" onClick={() => setAccountOpen(false)} className="bxl-account-item">Settings</Link>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                    <button onClick={signOut}
                      style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 13, fontFamily: 'Sora,sans-serif', textAlign: 'left', borderRadius: 6 }}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="bxl-nav-link">Sign in</Link>
                <Link href="/login?signup=true" style={{ marginLeft: 4, fontSize: 13, background: 'var(--accent)', color: 'var(--on-accent)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
                  Start free
                </Link>
              </>
            )}
          </div>

          <div className="bxl-nav-mobile-actions" style={{ alignItems: 'center', gap: 6 }}>
            <ThemeToggle compact />
            <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"
              style={{ width: 38, height: 38, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {mobileOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 49, background: 'var(--backdrop-strong)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(18px)', padding: 16 }}>
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              style={{ display: 'block', padding: '14px 16px', fontSize: 15, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border-soft)' }}>
              {l.label}
            </Link>
          ))}
          {user ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                style={{ display: 'block', textAlign: 'center', padding: 12, background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Dashboard →
              </Link>
              <button onClick={() => { signOut(); setMobileOpen(false) }}
                style={{ padding: 12, background: 'transparent', color: 'var(--error)', borderRadius: 10, fontSize: 14, fontFamily: 'Sora,sans-serif', border: '1px solid var(--error-border)', cursor: 'pointer' }}>
                Sign out ({userEmail})
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <Link href="/login" onClick={() => setMobileOpen(false)}
                style={{ display: 'block', textAlign: 'center', padding: 12, background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 10, fontSize: 14, textDecoration: 'none', border: '1px solid var(--border)' }}>
                Sign in
              </Link>
              <Link href="/login?signup=true" onClick={() => setMobileOpen(false)}
                style={{ display: 'block', textAlign: 'center', padding: 12, background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Start free →
              </Link>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .bxl-nav-link {
          font-size: 13px;
          color: var(--text-dim);
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .bxl-nav-link:hover { color: var(--text); background: var(--hover); }
        .bxl-account-item {
          display: block;
          padding: 10px 12px;
          font-size: 13px;
          color: var(--text);
          text-decoration: none;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .bxl-account-item:hover { background: var(--hover); }
        .bxl-nav-mobile-actions { display: none; }
        @media (max-width: 720px) {
          .bxl-nav-desktop { display: none !important; }
          .bxl-nav-mobile-actions { display: flex !important; }
        }
      `}</style>
    </>
  )
}
