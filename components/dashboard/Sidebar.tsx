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
  search: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
}

const Icon = ({ children, size = 17 }: { children: any; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

  const groups: { title: string; items: { href: string; label: string; icon: any; show: boolean; badge?: string }[] }[] = [
    {
      title: 'Workspace',
      items: [
        { href: '/dashboard', label: 'Convert', icon: ICONS.home, show: true },
        { href: '/dashboard/history', label: 'History', icon: ICONS.history, show: true },
        { href: '/dashboard/bulk', label: 'Bulk Upload', icon: ICONS.bulk, show: true, badge: isPaid ? undefined : 'Pro' },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/dashboard/team', label: 'Team', icon: ICONS.team, show: isFirm },
        { href: '/dashboard/billing', label: 'Billing', icon: ICONS.billing, show: !isTeamMember },
        { href: '/dashboard/settings', label: 'Settings', icon: ICONS.settings, show: true },
      ],
    },
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
  const nearLimit = usagePct >= 90

  // Days until monthly reset (1st of next month)
  const now = new Date()
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const daysToReset = Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 86400000))

  const openPalette = () => window.dispatchEvent(new CustomEvent('bxl:open-palette'))
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

  return (
    <aside style={{
      width: 252, height: '100vh', position: 'sticky', top: 0,
      background: 'var(--surface-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }} className="bxl-sidebar">
      <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={18} />
        <ThemeToggle compact size={30} />
      </div>

      {/* Command palette trigger */}
      <div style={{ padding: '0 14px 6px' }}>
        <button onClick={openPalette} className="bxl-search-trigger">
          <Icon size={14}>{ICONS.search}</Icon>
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <kbd className="mono" style={{
            fontSize: 9.5, padding: '2px 6px', borderRadius: 5,
            background: 'var(--kbd-bg)', border: '1px solid var(--kbd-border)',
            color: 'var(--text-muted)', letterSpacing: 0.5,
          }}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      </div>

      <nav style={{ padding: '6px 14px', flex: 1, overflowY: 'auto' }}>
        {groups.map(group => {
          const visible = group.items.filter(i => i.show)
          if (!visible.length) return null
          return (
            <div key={group.title} style={{ marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-faint)', letterSpacing: 2, textTransform: 'uppercase', padding: '8px 12px 6px' }}>
                {group.title}
              </div>
              {visible.map(item => {
                const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}
                    className={`bxl-nav-item ${active ? 'active' : ''}`}>
                    <span className="bxl-nav-bar" aria-hidden />
                    <Icon>{item.icon}</Icon>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 20,
                        background: 'var(--accent-bg)', color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                        fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                      }}>{item.badge.toUpperCase()}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {profile && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'var(--surface-elev)',
            border: '1px solid var(--border)',
            borderRadius: 14, padding: 14, marginBottom: 8,
            boxShadow: 'var(--shadow-sm)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5 }}>PAGES</span>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 20,
                background: 'var(--accent-bg)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
                fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
              }}>
                {isTeamMember ? 'TEAM' : (PLAN_LABELS[effectivePlan]?.toUpperCase() ?? 'FREE')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span className="display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {pagesUsed.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {limitDisplay}</span>
              {bonusPages > 0 && <span className="mono" style={{ color: 'var(--accent)', fontSize: 10 }}>+{bonusPages}</span>}
            </div>
            <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${usagePct}%`,
                background: nearLimit ? 'var(--error)' : 'var(--gradient-brand)',
                borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.21, 0.6, 0.35, 1)',
              }} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: 0.3 }}>
              Resets in {daysToReset} day{daysToReset !== 1 ? 's' : ''}
            </div>
            {!isPaid && (
              <Link href="/pricing" style={{
                display: 'block', textAlign: 'center', marginTop: 12,
                padding: '8px', borderRadius: 8,
                fontSize: 11.5, fontWeight: 600, color: 'var(--on-accent)',
                background: 'var(--accent)', textDecoration: 'none',
                boxShadow: 'var(--shadow-glow)',
              }}>Upgrade to Pro</Link>
            )}
          </div>

          <div className="bxl-user-row">
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--gradient-brand)',
              color: '#fff', fontWeight: 600, fontSize: 13,
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
            <button onClick={signOut} disabled={signingOut} title="Sign out" className="bxl-signout-btn">
              <Icon size={15}>{ICONS.signout}</Icon>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .bxl-search-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 12px;
          border-radius: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 12.5px;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .bxl-search-trigger:hover {
          border-color: var(--accent-border);
          background: var(--surface-elev);
          box-shadow: var(--shadow-sm);
        }
        .bxl-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dim);
          text-decoration: none;
          margin-bottom: 2px;
          position: relative;
          transition: color 0.15s, background 0.15s;
        }
        .bxl-nav-item:hover { color: var(--text); background: var(--hover); }
        .bxl-nav-item.active {
          color: var(--accent);
          background: var(--accent-bg);
          font-weight: 600;
        }
        .bxl-nav-bar {
          position: absolute;
          left: -14px;
          top: 50%;
          transform: translateY(-50%) scaleY(0);
          width: 3px;
          height: 20px;
          border-radius: 0 3px 3px 0;
          background: var(--accent);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .bxl-nav-item.active .bxl-nav-bar { transform: translateY(-50%) scaleY(1); }
        .bxl-user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 8px;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .bxl-user-row:hover { background: var(--hover); }
        .bxl-signout-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          background: transparent;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .bxl-signout-btn:hover {
          background: var(--error-bg);
          border-color: var(--error-border);
          color: var(--error);
        }
      `}</style>
    </aside>
  )
}
