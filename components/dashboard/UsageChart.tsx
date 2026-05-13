'use client'
import { useMemo } from 'react'
import { Conversion } from './DashboardContext'

interface Props {
  conversions: Conversion[]
  days?: number
}

export default function UsageChart({ conversions, days = 30 }: Props) {
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

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>LAST {days} DAYS</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Activity</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.01em' }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>conversions</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110, marginBottom: 8 }}>
        {data.map((d, i) => {
          const heightPct = (d.pages / max) * 100
          const isToday = i === data.length - 1
          const hasActivity = d.pages > 0
          return (
            <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative', minWidth: 0 }} title={`${d.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${d.count} conv · ${d.pages} pages`}>
              <div className="bxl-bar"
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, hasActivity ? 8 : 2)}%`,
                  background: hasActivity
                    ? (isToday ? 'linear-gradient(180deg, var(--accent), var(--accent-strong))' : 'var(--accent-bg-strong)')
                    : 'var(--surface-2)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'all 0.2s',
                  cursor: hasActivity ? 'pointer' : 'default',
                  minHeight: 2,
                }} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5 }}>
        <span>{data[0].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span>{data[Math.floor(data.length / 2)].date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>

      <style jsx global>{`
        .bxl-bar:hover {
          background: var(--accent) !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
