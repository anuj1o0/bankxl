'use client'
import { useMemo, useState } from 'react'
import { Conversion } from './DashboardContext'
import AnimatedNumber from '@/components/AnimatedNumber'

interface Props {
  conversions: Conversion[]
  days?: number
}

export default function UsageChart({ conversions, days = 30 }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const data = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const buckets: { date: Date; count: number; pages: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      buckets.push({ date: d, count: 0, pages: 0 })
    }
    for (const c of conversions) {
      if (c.status !== 'success') continue
      const cd = new Date(c.created_at)
      const idx = buckets.findIndex(b =>
        b.date.getDate() === cd.getDate() &&
        b.date.getMonth() === cd.getMonth() &&
        b.date.getFullYear() === cd.getFullYear()
      )
      if (idx >= 0) {
        buckets[idx].count += 1
        buckets[idx].pages += c.pages || 0
      }
    }
    return buckets
  }, [conversions, days])

  const max = Math.max(1, ...data.map(d => d.pages))
  const total = data.reduce((s, d) => s + d.count, 0)
  const totalPages = data.reduce((s, d) => s + d.pages, 0)
  const hovered = hover !== null ? data[hover] : null

  return (
    <div className="card" style={{ borderRadius: 16, padding: 22, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 4 }}>LAST {days} DAYS</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Activity</div>
        </div>
        <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
          <div>
            <div className="display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              <AnimatedNumber end={total} format={n => Math.round(n).toString()} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0.5 }}>CONVERSIONS</div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              <AnimatedNumber end={totalPages} format={n => Math.round(n).toLocaleString('en-IN')} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0.5 }}>PAGES</div>
          </div>
        </div>
      </div>

      {/* Hover readout */}
      <div className="mono" style={{ height: 16, fontSize: 11, color: hovered ? 'var(--text-dim)' : 'var(--text-faint)', marginBottom: 6, letterSpacing: 0.3, transition: 'color 0.15s' }}>
        {hovered
          ? `${hovered.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} — ${hovered.count} conversion${hovered.count !== 1 ? 's' : ''}, ${hovered.pages} page${hovered.pages !== 1 ? 's' : ''}`
          : 'Hover a bar for details'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 104, marginBottom: 8 }}
        onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const heightPct = (d.pages / max) * 100
          const isToday = i === data.length - 1
          const hasActivity = d.pages > 0
          const isHover = hover === i
          return (
            <div key={i}
              onMouseEnter={() => setHover(i)}
              style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative', minWidth: 0, cursor: hasActivity ? 'pointer' : 'default' }}>
              <div
                className="bxl-chart-bar"
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, hasActivity ? 8 : 2.5)}%`,
                  background: hasActivity
                    ? (isHover || isToday ? 'var(--gradient-brand)' : 'var(--accent-bg-strong)')
                    : isHover ? 'var(--surface-3)' : 'var(--surface-2)',
                  borderRadius: '3px 3px 1px 1px',
                  minHeight: 2,
                  boxShadow: isHover && hasActivity ? '0 0 10px var(--accent-glow)' : 'none',
                  transformOrigin: 'bottom',
                  animationDelay: `${i * 14}ms`,
                  transition: 'background 0.15s, box-shadow 0.15s',
                }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5 }}>
        <span>{data[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span>{data[Math.floor(data.length / 2)].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span style={{ color: 'var(--accent)' }}>Today</span>
      </div>

      <style jsx global>{`
        @keyframes bxl-bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .bxl-chart-bar {
          animation: bxl-bar-grow 0.5s cubic-bezier(0.21, 0.6, 0.35, 1) backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .bxl-chart-bar { animation: none; }
        }
      `}</style>
    </div>
  )
}
