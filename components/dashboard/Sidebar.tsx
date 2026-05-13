'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient, PLAN_LABELS } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { ThemeToggle } from '@/components/Theme'

interface SidebarProfile {
  plan: string
  email: string
  full_name?: string
}

interface Props {
  profile: SidebarProfile | null
  pagesUsed: number
  pagesLimit: number
  bonusPages?: number
  effectivePlan: 'free' | 'pro' | 'firm'
  isTeamMember: boolean
  onClose?: () => void
}

const ICONS = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4a2 2 0 01-2-2v-5h-2v5a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  bulk: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  team: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  billing: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 14h4" /></>,
  signout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
}

const Icon = ({ children }: { children: any }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export default function Sidebar({ profile, pagesUsed, pagesLimit, bonusPages = 0, effectivePlan, isTeamMember, onClose }: Props) {
  const effectiveLimit = pagesLimit + bonusPages
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const isFirm = effectivePlan === 'firm'
  const isPaid = effectivePlan === 'pro' || effectivePlan === 'firm'

  const items: { href: string; label: string; icon: any; show: boolean; badge?: string }[] = [
    { href: '/dashboard', label: 'Convert', icon: ICONS.home, show: true },
    { href: '/dashboard/history', label: 'History', icon: ICONS.history, show: true },
    { href: '/dashboard/bulk', label: 'Bulk Upload', icon: ICONS.bulk, show: true, badge: isPaid ? undefined : 'Pro' },
    { href: '/dashboard/team', label: 'Team', icon: ICONS.team, show: isFirm },
    { href: '/dashboard/settings', label: 'Settings', icon: ICONS.settings, show: true },
    { href: '/dashboard/billing', label: 'Billing', icon: ICONS.billing, show: !isTeamMember },
  ]

  const signOut = async () => {
    setSigningOut(true)
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const limitDisplay = effectiveLimit.toLocaleString('en-IN')
  const usagePct = Math.min((pagesUsed / effectiveLimit) * 100, 100)

  return (
    <aside style={{
      width: 248, height: '100vh', position: 'sticky', top: 0,
      background: 'var(--surface-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }} className="bxl-sidebar">
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={18} />
        <ThemeToggle compact size={32} />
      </div>

      <nav style={{ padding: '4px 12px', flex: 1, overflowY: 'auto' }}>
        {items.filter(i => i.show).map(item => {
          const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                fontSize: 13, fontWeight: 500,
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                background: active ? 'var(--accent-bg)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2, position: 'relative',
                border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}>
              <Icon>{item.icon}</Icon>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 20,
                  background: 'var(--surface-3)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                }}>{item.badge.toUpperCase()}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {profile && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'var(--surface-elev)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: 12, marginBottom: 8,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>PAGES</span>
              <span style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 20,
                background: 'var(--accent-bg)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
                fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
              }}>
                {isTeamMember ? 'TEAM' : (PLAN_LABELS[effectivePlan]?.toUpperCase() ?? 'FREE')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{pagesUsed.toLocaleString('en-IN')}</span>
              <span style={{ color: 'var(--text-muted)' }}> / {limitDisplay}</span>
              {bonusPages > 0 && <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 4 }}> +{bonusPages}</span>}
            </div>
            <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: usagePct >= 90 ? 'var(--error)' : 'var(--accent)', width: `${usagePct}%`, transition: 'width 0.5s ease' }} />
            </div>
            {!isPaid && (
              <Link href="/pricing" style={{
                display: 'block', textAlign: 'center', marginTop: 10,
                padding: '7px', borderRadius: 6,
                fontSize: 11, fontWeight: 600, color: 'var(--on-accent)',
                background: 'var(--accent)', textDecoration: 'none',
              }}>Upgrade to Pro</Link>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
              color: 'var(--on-accent)', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {(profile.full_name || profile.email)[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.full_name || profile.email.split('@')[0]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.email}
              </div>
            </div>
            <button onClick={signOut} disabled={signingOut} title="Sign out"
              style={{
                width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'var(--surface-3)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Icon>{ICONS.signout}</Icon>
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
