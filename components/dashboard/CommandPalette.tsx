'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from './DashboardContext'

interface Cmd {
  id: string
  label: string
  hint?: string
  group: string
  icon: any
  action: () => void
  show?: boolean
}

const Icon = ({ children }: { children: any }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export default function CommandPalette() {
  const router = useRouter()
  const { isFirm, isPaid, conversions } = useDashboard()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const go = (path: string) => { setOpen(false); router.push(path) }

  const commands: Cmd[] = useMemo(() => {
    const cmds: Cmd[] = [
      { id: 'convert', label: 'Convert a PDF', hint: 'C', group: 'Navigate', icon: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />, action: () => go('/dashboard') },
      { id: 'history', label: 'View history', hint: 'H', group: 'Navigate', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>, action: () => go('/dashboard/history') },
      { id: 'bulk', label: 'Bulk upload', hint: 'B', group: 'Navigate', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>, action: () => go('/dashboard/bulk'), show: isPaid },
      { id: 'team', label: 'Manage team', group: 'Navigate', icon: <><circle cx="9" cy="7" r="4" /><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /></>, action: () => go('/dashboard/team'), show: isFirm },
      { id: 'settings', label: 'Settings', hint: 'S', group: 'Navigate', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>, action: () => go('/dashboard/settings') },
      { id: 'billing', label: 'Billing & plans', group: 'Navigate', icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>, action: () => go('/dashboard/billing') },
      { id: 'pricing', label: 'View pricing', group: 'Marketing', icon: <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" /></>, action: () => go('/pricing') },
      { id: 'support', label: 'Email support', hint: '?', group: 'Help', icon: <><path d="M4 4h16v12H5.17L4 17.17V4z" /></>, action: () => { window.location.href = 'mailto:support@banlxlai.com'; setOpen(false) } },
    ]

    const recent = conversions.slice(0, 5)
    for (const c of recent) {
      if (c.status !== 'success') continue
      cmds.push({
        id: 'redownload-' + c.id,
        label: `Re-download ${c.filename}`,
        hint: c.bank_name || undefined,
        group: 'Recent',
        icon: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
        action: () => { window.location.href = `/api/redownload/${c.id}?format=excel`; setOpen(false) },
      })
    }

    return cmds.filter(c => c.show !== false)
  }, [isPaid, isFirm, conversions])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [commands, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Cmd[]>()
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    }
    return [...map.entries()]
  }, [filtered])

  const flat = filtered

  useEffect(() => { setActive(0) }, [query])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); flat[active].action() }
  }

  if (!open) return null

  return (
    <div onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, calc(100vw - 32px))',
        background: 'var(--surface-elev)',
        border: '1px solid var(--border-strong)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg)',
        animation: 'bxl-cmd-open 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown} placeholder="Type a command or search..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none' }} />
          <kbd style={{ fontSize: 10, padding: '3px 7px', background: 'var(--kbd-bg)', borderRadius: 4, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', border: '1px solid var(--kbd-border)' }}>esc</kbd>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {flat.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No matches.</div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} style={{ marginBottom: 4 }}>
                <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, padding: '8px 12px 4px' }}>{group.toUpperCase()}</div>
                {items.map(c => {
                  const idx = flat.indexOf(c)
                  const isActive = idx === active
                  return (
                    <button key={c.id} onClick={c.action} onMouseEnter={() => setActive(idx)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        background: isActive ? 'var(--accent-bg)' : 'transparent',
                        border: '1px solid ' + (isActive ? 'var(--accent-border)' : 'transparent'),
                        borderRadius: 7, cursor: 'pointer', color: isActive ? 'var(--text)' : 'var(--text-dim)',
                        fontFamily: 'Sora,sans-serif', fontSize: 13, textAlign: 'left',
                        transition: 'all 0.1s',
                      }}>
                      <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                        <Icon>{c.icon}</Icon>
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      {c.hint && (
                        <span className="mono" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--kbd-bg)', borderRadius: 4, color: 'var(--text-muted)' }}>{c.hint}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd style={{ fontSize: 9, padding: '2px 5px', background: 'var(--kbd-bg)', borderRadius: 3, fontFamily: 'DM Mono, monospace' }}>↑↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd style={{ fontSize: 9, padding: '2px 5px', background: 'var(--kbd-bg)', borderRadius: 3, fontFamily: 'DM Mono, monospace' }}>↵</kbd> select
          </span>
        </div>
      </div>
      <style jsx global>{`
        @keyframes bxl-cmd-open {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
