'use client'
import { useState } from 'react'
import { useConversions } from './ConversionsContext'

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  extracting: 'Reading transactions',
  building: 'Building file',
  done: 'Ready',
  error: 'Failed',
}

export default function JobsToast() {
  const { jobs, active, recent, download, dismiss, clearAll } = useConversions()
  const [collapsed, setCollapsed] = useState(false)

  if (!jobs.length) return null

  const showCount = active.length + recent.filter(r => !r.downloaded).length
  if (showCount === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 22, right: 22, zIndex: 100,
      width: 360, maxWidth: 'calc(100vw - 32px)',
      background: 'var(--backdrop-strong)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      backdropFilter: 'blur(14px)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      animation: 'bxl-toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <div onClick={() => setCollapsed(!collapsed)} style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {active.length > 0 && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'bxl-pulse 1.5s infinite' }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {active.length > 0 ? `${active.length} converting` : `${recent.filter(r => !r.downloaded).length} ready`}
          </span>
          {recent.length > 0 && active.length === 0 && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 7px', borderRadius: 20, border: '1px solid var(--accent-border)' }}>DONE</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!active.length && (
            <button onClick={(e) => { e.stopPropagation(); clearAll() }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              Clear
            </button>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {jobs.map(j => (
            <div key={j.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, color: 'var(--text)' }} title={j.filename}>
                  {j.filename}
                </div>
                <button onClick={() => dismiss(j.id)} aria-label="Dismiss"
                  style={{ width: 22, height: 22, borderRadius: 5, background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: j.status === 'done' || j.status === 'error' ? 8 : 6, letterSpacing: 0.5 }}>
                {j.status === 'done'
                  ? `${j.bank ? j.bank + ' · ' : ''}${j.txCount} transactions · ${j.format.toUpperCase()}`
                  : j.status === 'error' ? `Error: ${j.error}` : STATUS_LABELS[j.status]}
              </div>
              {j.status !== 'done' && j.status !== 'error' && (
                <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', width: `${j.progress}%`, transition: 'width 0.3s ease', boxShadow: '0 0 6px var(--accent-glow)' }} />
                </div>
              )}
              {j.status === 'done' && !j.downloaded && (
                <button onClick={() => download(j.id)}
                  style={{ width: '100%', padding: 8, marginTop: 6, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download
                </button>
              )}
              {j.status === 'done' && j.downloaded && (
                <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Downloaded
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes bxl-toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bxl-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
