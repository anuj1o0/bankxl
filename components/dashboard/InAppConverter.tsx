'use client'
import { useState, useRef, useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { useConversions } from './ConversionsContext'
import TopupButton from './TopupButton'

const FORMATS = [
  { key: 'excel', label: 'Excel', sub: '.xlsx', icon: '📊' },
  { key: 'csv', label: 'CSV', sub: '.csv', icon: '🗂' },
  { key: 'json', label: 'JSON', sub: '.json', icon: '⚙' },
  { key: 'tally', label: 'Tally XML', sub: '.xml', icon: '🧾' },
] as const

const STAGE_LABELS: Record<string, { label: string; sub: string }> = {
  queued: { label: 'Queued', sub: 'Starting...' },
  uploading: { label: 'Uploading', sub: 'Sending PDF to secure server' },
  extracting: { label: 'Extracting', sub: 'AI is reading every transaction' },
  building: { label: 'Building file', sub: 'Formatting & finalizing' },
}

export default function InAppConverter() {
  const { profile, isPaid } = useDashboard()
  const { active, recent, startJob, download, dismiss } = useConversions()

  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<string>(profile?.default_format || 'excel')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const myJob = useMemo(() => {
    return [...active, ...recent].find(j => file && j.filename === file.name && j.startedAt > Date.now() - 600000)
  }, [active, recent, file])

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Please select a PDF file.'); return }
    if (f.size > 25 * 1024 * 1024) { setError('File too large (max 25 MB).'); return }
    setFile(f); setError('')
  }

  const convert = () => {
    if (!file) return
    if (!isPaid && (format === 'csv' || format === 'json' || format === 'tally')) {
      setError('CSV / JSON / Tally export requires Pro. Upgrade for ₹299/mo.'); return
    }
    setError('')
    startJob(file, format as any)
  }

  const reset = () => {
    setFile(null); setError('')
    if (myJob) dismiss(myJob.id)
  }

  const showJob = myJob && (myJob.status !== 'done' || !myJob.downloaded)
  const stage = myJob ? STAGE_LABELS[myJob.status] : null
  const isWorking = myJob && (myJob.status !== 'done' && myJob.status !== 'error')
  const isDone = myJob?.status === 'done'
  const isError = myJob?.status === 'error'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.2s',
    }}>
      {!showJob && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            style={{
              padding: '52px 28px', margin: 22, textAlign: 'center', cursor: 'pointer', borderRadius: 12,
              border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: dragging ? 'var(--accent-bg)' : 'var(--surface-2)',
              transition: 'all 0.2s',
            }}>
            <div style={{
              width: 60, height: 60, background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: dragging ? '0 0 0 4px var(--accent-bg)' : 'none',
              transition: 'all 0.2s',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={dragging ? 'var(--accent)' : 'var(--text-dim)'} strokeWidth="1.6" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            {file ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{file.name}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · PDF</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Drop your bank statement PDF here</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>or <span style={{ color: 'var(--accent)' }}>browse files</span></div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12 }}>PDF only · Max 25 MB · 100% private</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div style={{ padding: '0 22px 18px' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1 }}>OUTPUT FORMAT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {FORMATS.map(f => {
                const locked = !isPaid && f.key !== 'excel'
                return (
                  <button key={f.key} onClick={() => !locked && setFormat(f.key)} disabled={locked}
                    style={{
                      padding: '12px 10px',
                      background: format === f.key ? 'var(--accent-bg)' : 'var(--surface-2)',
                      border: `1px solid ${format === f.key ? 'var(--accent-border)' : 'var(--border)'}`,
                      borderRadius: 10, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                      fontFamily: 'Sora,sans-serif',
                      color: format === f.key ? 'var(--accent)' : locked ? 'var(--text-faint)' : 'var(--text-dim)',
                      opacity: locked ? 0.55 : 1,
                      position: 'relative',
                    }}>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{f.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{f.label}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{f.sub}</div>
                    {locked && (
                      <span style={{
                        position: 'absolute', top: 6, right: 6, fontSize: 8, padding: '2px 6px',
                        background: 'var(--surface-3)', color: 'var(--text-dim)', borderRadius: 20,
                        border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                      }}>PRO</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div style={{ margin: '0 22px 16px', padding: '12px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '0 22px 22px' }}>
            <button onClick={convert} disabled={!file}
              style={{
                width: '100%', padding: 15, background: file ? 'var(--accent)' : 'var(--surface-2)',
                color: file ? 'var(--on-accent)' : 'var(--text-faint)',
                fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 12, cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: file ? 'var(--shadow-glow)' : 'none',
                transition: 'all 0.2s',
              }}>
              {file ? 'Convert now →' : 'Choose a PDF to convert'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
              ⚡ Average conversion time: 15–25 seconds. You can navigate freely while it runs.
            </div>
          </div>
        </>
      )}

      {showJob && isWorking && (
        <div style={{ padding: 36, textAlign: 'center' }}>
          <div style={{
            width: 68, height: 68, background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', position: 'relative',
          }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--accent-bg-strong)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{stage?.label}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 22 }}>{stage?.sub}</p>
          <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))', width: `${myJob?.progress || 0}%`, transition: 'width 0.3s ease', boxShadow: '0 0 12px var(--accent-glow)' }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 18 }}>
            {Math.round(myJob?.progress || 0)}% · processing in background — feel free to navigate
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {showJob && isDone && myJob && (
        <div style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'var(--accent-bg)', border: '1.5px solid var(--accent-border)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 6px var(--accent-bg)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Ready to download</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 22 }}>
            {myJob.bank ? `${myJob.bank} · ` : ''}{myJob.txCount} transactions in {((myJob.completedAt! - myJob.startedAt) / 1000).toFixed(1)}s
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
            {[
              { v: myJob.txCount, l: 'Transactions' },
              { v: myJob.pages, l: 'Pages' },
              { v: ((myJob.completedAt! - myJob.startedAt) / 1000).toFixed(1) + 's', l: 'Time' },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--accent)' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => download(myJob.id)}
            style={{ width: '100%', padding: 15, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 12, fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {myJob.format.toUpperCase()}
          </button>
          <button onClick={reset} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
            Convert another →
          </button>
        </div>
      )}

      {showJob && isError && myJob && (
        <div style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'var(--error-bg)', border: '1.5px solid var(--error-border)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            {myJob.errorCanTopup ? 'Out of pages' : 'Conversion failed'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 22, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 22px' }}>{myJob.error}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {myJob.errorCanTopup && <TopupButton onSuccess={reset} />}
            <button onClick={reset}
              style={{ padding: '12px 22px', background: myJob.errorCanTopup ? 'var(--surface-2)' : 'var(--accent)', color: myJob.errorCanTopup ? 'var(--text)' : 'var(--on-accent)', border: myJob.errorCanTopup ? '1px solid var(--border-strong)' : 'none', borderRadius: 10, fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {myJob.errorCanTopup ? 'Dismiss' : 'Try again'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
