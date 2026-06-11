'use client'
import Link from 'next/link'
import { useMobileMenu } from './MobileMenuContext'

interface Props {
  title: string
  subtitle?: string
  cta?: { label: string; href: string } | { label: string; onClick: () => void }
}

export default function TopBar({ title, subtitle, cta }: Props) {
  const menu = useMobileMenu()
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'var(--backdrop)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {menu && (
            <button onClick={() => menu.setOpen(true)} aria-label="Open menu" className="bxl-mobile-menu"
              style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', display: 'none', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: subtitle ? 2 : 0, lineHeight: 1.2, color: 'var(--text-strong)' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span className="mono bxl-topbar-date" style={{ fontSize: 11, color: 'var(--text-faint)', letterSpacing: 0.5 }}>{today}</span>
          {cta && (
            'href' in cta ? (
              <Link href={cta.href} style={{
                padding: '10px 18px', borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)',
                fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-glow)',
              }}>{cta.label}</Link>
            ) : (
              <button onClick={cta.onClick} style={{
                padding: '10px 18px', borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Sora,sans-serif',
                boxShadow: 'var(--shadow-glow)',
              }}>{cta.label}</button>
            )
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) { .bxl-topbar-date { display: none; } }
      `}</style>
    </header>
  )
}
