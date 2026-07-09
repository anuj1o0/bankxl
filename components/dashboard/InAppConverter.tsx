'use client'
import { useState, useRef, useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { useConversions } from './ConversionsContext'
import TopupButton from './TopupButton'

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  excel: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 12 6 6"/><path d="m15 12-6 6"/></>,
  csv: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>,
  json: <><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5c0 1.1.9 2 2 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></>,
  tally: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></>,
}

const FORMATS = [
  { key: 'excel', label: 'Excel', sub: '.xlsx' },
  { key: 'csv', label: 'CSV', sub: '.csv' },
  { key: 'json', label: 'JSON', sub: '.json' },
  { key: 'tally', label: 'Tally XML', sub: '.xml' },
] as const

// Ordered pipeline stages shown in the progress tracker
const STAGES = [
  { key: 'uploading', label: 'Upload', sub: 'Sending PDF to secure server' },
  { key: 'extracting', label: 'Extract', sub: 'AI is reading every transaction' },
  { key: 'building', label: 'Build', sub: 'Formatting & finalizing your file' },
] as const

function stageIndex(status: string): number {
  if (status === 'queued' || status === 'uploading') return 0
  if (status === 'extracting') return 1
  return 2
}

const Ic = ({ children, size = 16 }: { children: any; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

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
      setError('CSV / JSON / Tally export requires Pro. Upgrade for ₹499/mo.'); return
    }
    setError('')
    startJob(file, format as any)
  }

  const reset = () => {
    setFile(null); setError('')
    if (myJob) dismiss(myJob.id)
  }

  const showJob = myJob && (myJob.status !== 'done' || !myJob.downloaded)
  const isWorking = myJob && (myJob.status !== 'done' && myJob.status !== 'error')
  const isDone = myJob?.status === 'done'
  const isError = myJob?.status === 'error'
  const currentStage = myJob ? stageIndex(myJob.status) : 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18,
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
            className="bxl-dropzone"
            style={{
              padding: '48px 28px', margin: 20, textAlign: 'center', cursor: 'pointer', borderRadius: 14,
              border: `1.5px dashed ${dragging || file ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: dragging ? 'var(--accent-bg)' : file ? 'linear-gradient(160deg, var(--accent-bg), var(--surface-2))' : 'var(--surface-2)',
              boxShadow: dragging ? '0 0 0 5px var(--accent-bg), inset 0 0 40px var(--accent-bg)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.21, 0.6, 0.35, 1)',
              position: 'relative',
            }}>
            <div style={{
              width: 62, height: 62,
              background: file ? 'var(--accent)' : 'var(--accent-bg)',
              border: '1px solid var(--accent-border)', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              transform: dragging ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
              boxShadow: file ? 'var(--shadow-glow)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: file ? 'var(--on-accent)' : dragging ? 'var(--accent)' : 'var(--text-dim)',
            }}>
              {file ? (
                <Ic size={26}><polyline points="20 6 9 17 4 12"/></Ic>
              ) : (
                <Ic size={26}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></Ic>
              )}
            </div>
            {file ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--text-strong)' }}>{file.name}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · PDF</div>
                <button onClick={e => { e.stopPropagation(); setFile(null) }}
                  style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                  Choose a different file
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text-strong)' }}>
                  {dragging ? 'Drop it here' : 'Drop your bank statement PDF'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>or <span style={{ color: 'var(--accent)', fontWeight: 500 }}>browse files</span></div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 16 }}>
                  {['PDF only', 'Max 25 MB', '100% private'].map(t => (
                    <span key={t} className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <div style={{ padding: '0 20px 16px' }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1.5 }}>OUTPUT FORMAT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {FORMATS.map(f => {
                const locked = !isPaid && f.key !== 'excel'
                const selected = format === f.key
                return (
                  <button key={f.key} onClick={() => !locked && setFormat(f.key)} disabled={locked}
                    style={{
                      padding: '12px 10px',
                      background: selected ? 'var(--accent-bg)' : 'var(--surface-2)',
                      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                      fontFamily: 'Sora,sans-serif',
                      color: selected ? 'var(--accent)' : locked ? 'var(--text-faint)' : 'var(--text-dim)',
                      opacity: locked ? 0.55 : 1,
                      position: 'relative',
                      transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                      transform: selected ? 'translateY(-1px)' : 'none',
                    }}>
                    <div style={{ marginBottom: 6, display: 'flex' }}><Ic size={17}>{FORMAT_ICONS[f.key]}</Ic></div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{f.sub}</div>
                    {selected && (
                      <span style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ic size={9}><polyline points="20 6 9 17 4 12"/></Ic>
                      </span>
                    )}
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
            <div className="anim-pop" style={{ margin: '0 20px 16px', padding: '12px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={convert} disabled={!file}
              style={{
                width: '100%', padding: 15,
                background: file ? 'var(--accent)' : 'var(--surface-2)',
                color: file ? 'var(--on-accent)' : 'var(--text-faint)',
                fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 13, cursor: file ? 'pointer' : 'not-allowed',
                boxShadow: file ? 'var(--shadow-glow)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}>
              {file ? <>Convert now <Ic size={15}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Ic></> : 'Choose a PDF to convert'}
            </button>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center', letterSpacing: 0.3 }}>
              Avg 15–25s · runs in background · navigate freely
            </div>
          </div>
        </>
      )}

      {showJob && isWorking && myJob && (
        <div style={{ padding: '36px 32px' }}>
          {/* Stage tracker */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', top: 17, left: 40, right: 40, height: 2, background: 'var(--surface-3)', zIndex: 0 }}>
              <div style={{ height: '100%', width: `${(currentStage / (STAGES.length - 1)) * 100}%`, background: 'var(--gradient-brand)', transition: 'width 0.5s ease' }} />
            </div>
            {STAGES.map((s, i) => {
              const done = i < currentStage
              const current = i === currentStage
              return (
                <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: done ? 'var(--accent)' : current ? 'var(--accent-bg)' : 'var(--surface-2)',
                    border: `1.5px solid ${done || current ? 'var(--accent)' : 'var(--border-strong)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: done ? 'var(--on-accent)' : current ? 'var(--accent)' : 'var(--text-faint)',
                    boxShadow: current ? '0 0 0 5px var(--accent-bg)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {done ? (
                      <Ic size={15}><polyline points="20 6 9 17 4 12"/></Ic>
                    ) : current ? (
                      <div style={{ width: 14, height: 14, border: '2px solid var(--accent-bg-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <span className="mono" style={{ fontSize: 11 }}>{i + 1}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: current ? 600 : 500, color: done || current ? 'var(--text)' : 'var(--text-faint)' }}>{s.label}</span>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{STAGES[currentStage].label}ing…</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{STAGES[currentStage].sub}</p>
          </div>

          <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', background: 'var(--gradient-brand)', width: `${myJob.progress || 0}%`, transition: 'width 0.3s ease', boxShadow: '0 0 12px var(--accent-glow)', borderRadius: 3 }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            {Math.round(myJob.progress || 0)}% · processing in background — feel free to navigate
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {showJob && isDone && myJob && (
        <div className="anim-pop" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'var(--accent)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 0 8px var(--accent-bg), var(--shadow-glow)' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>Ready to download</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>
            {myJob.bank ? `${myJob.bank} · ` : ''}every transaction extracted and formatted
          </p>
          {myJob.warning && (
            <div style={{ margin: '0 0 20px', padding: '12px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 10, fontSize: 12.5, color: 'var(--warning)', textAlign: 'left', lineHeight: 1.5 }}>
              ⚠ {myJob.warning}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { v: myJob.txCount, l: 'Transactions' },
              { v: myJob.pages, l: 'Pages' },
              { v: ((myJob.completedAt! - myJob.startedAt) / 1000).toFixed(1) + 's', l: 'Time' },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                <div className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0.5 }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <button onClick={() => download(myJob.id)}
            style={{ width: '100%', padding: 15, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 13, fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-glow)' }}>
            <Ic size={16}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Ic>
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
