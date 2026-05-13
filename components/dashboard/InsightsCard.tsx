'use client'
import { useMemo } from 'react'
import { Conversion } from './DashboardContext'

const SECONDS_PER_TX_MANUAL = 25

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

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))',
      border: '1px solid var(--accent-border)',
      borderRadius: 14, padding: 20,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
        <span style={{ fontSize: 18 }}>✨</span>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Your impact</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {insights.savedHours >= 1 ? `${insights.savedHours}h` : `${Math.round(insights.savedHours * 60)}m`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>saved vs. manual entry</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {insights.totalProcessed >= 10000000
              ? `₹${(insights.totalProcessed / 10000000).toFixed(1)}Cr`
              : insights.totalProcessed >= 100000
              ? `₹${(insights.totalProcessed / 100000).toFixed(1)}L`
              : insights.totalProcessed >= 1000
              ? `₹${(insights.totalProcessed / 1000).toFixed(0)}K`
              : `₹${insights.totalProcessed.toFixed(0)}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>value processed</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {insights.totalTx.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>rows extracted</div>
        </div>
      </div>
    </div>
  )
}
