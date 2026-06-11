'use client'
import { useMemo } from 'react'
import { Conversion } from './DashboardContext'
import AnimatedNumber from '@/components/AnimatedNumber'

const SECONDS_PER_TX_MANUAL = 25

function fmtMoney(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`
  return `₹${v.toFixed(0)}`
}

export default function InsightsCard({ conversions }: { conversions: Conversion[] }) {
  const insights = useMemo(() => {
    const success = conversions.filter(c => c.status === 'success')
    let totalTx = 0, totalDebit = 0, totalCredit = 0, totalProcessingMs = 0
    for (const c of success) {
      totalTx += c.transactions_extracted || 0
      totalDebit += c.total_debit || 0
      totalCredit += c.total_credit || 0
      totalProcessingMs += c.processing_time_ms || 0
    }
    const manualSeconds = totalTx * SECONDS_PER_TX_MANUAL
    const realSeconds = totalProcessingMs / 1000
    const savedSeconds = Math.max(0, manualSeconds - realSeconds)
    const savedHours = savedSeconds / 3600
    return {
      savedHours: Math.round(savedHours * 10) / 10,
      totalProcessed: totalDebit + totalCredit,
      totalTx,
      successCount: success.length,
    }
  }, [conversions])

  if (insights.successCount === 0) return null

  const stats = [
    {
      value: insights.savedHours >= 1
        ? <><AnimatedNumber end={insights.savedHours} format={n => (Math.round(n * 10) / 10).toString()} />h</>
        : <><AnimatedNumber end={Math.round(insights.savedHours * 60)} format={n => Math.round(n).toString()} />m</>,
      label: 'saved vs. manual entry',
    },
    { value: fmtMoney(insights.totalProcessed), label: 'value processed' },
    {
      value: <AnimatedNumber end={insights.totalTx} format={n => Math.round(n).toLocaleString('en-IN')} />,
      label: 'rows extracted',
    },
  ]

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))',
      borderColor: 'var(--accent-border)',
      borderRadius: 16, padding: 22,
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, position: 'relative' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z"/></svg>
        </span>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Your impact</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, position: 'relative' }}>
        {stats.map(s => (
          <div key={s.label}>
            <div className="display" style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 7 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
