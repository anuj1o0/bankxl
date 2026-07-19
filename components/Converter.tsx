'use client'
import { useState, useRef } from 'react'
import { track } from '@/lib/track'
import { convertPdf, ConvertError, type ConvertOutput } from '@/lib/convert-client'

interface Props {
  user: any
  freeMode?: boolean
  initialFormat?: 'excel' | 'csv' | 'json' | 'tally'
  showFormatPicker?: boolean
}

interface Result {
  txCount: number
  pages: number
  time: string
  bank: string
  blob: Blob
  filename: string
  warning?: string
}

const FORMATS = [
  { key: 'excel', label: 'Excel (.xlsx)', sub: 'Recommended', icon: '📊' },
  { key: 'csv', label: 'CSV', sub: 'For other tools', icon: '🗂' },
  { key: 'json', label: 'JSON', sub: 'For developers', icon: '⚙' },
  { key: 'tally', label: 'Tally XML', sub: 'Direct import', icon: '🧾' },
] as const

export default function Converter({ user, freeMode, initialFormat = 'excel', showFormatPicker = true }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<typeof FORMATS[number]['key']>(initialFormat)
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState<'idle' | 'converting' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Please select a PDF file.'); return }
    if (f.size > 25 * 1024 * 1024) { setError('File too large (max 25 MB).'); return }
    setFile(f); setError('')
  }

  const convert = async () => {
    if (!file) return
    if (!user && !freeMode) {
      track('signup_wall_hit', { source: 'homepage_converter' })
      window.location.href = '/login?redirect=/#converter'; return
    }

    track('upload_started', { format })
    setStage('converting'); setProgress(0); setActiveStep(0)

    // Simulated progress animation for the single-request path (which has
    // no intermediate signals). The moment the chunked pipeline reports
    // real per-chunk progress, `real.on` flips and the animation yields to
    // actual numbers — page 30 of 178 shows real movement, not a guess.
    const real = { on: false }
    const steps = [
      { end: 25, delay: 700 },
      { end: 55, delay: 1500 },
      { end: 90, delay: 4500 },
    ]
    // setInterval, NOT requestAnimationFrame: browsers pause rAF entirely in
    // hidden tabs, and convert() awaits these promises — with rAF, a user who
    // switched tabs right after clicking Convert saw the conversion "stuck"
    // forever even though the server had finished. Intervals keep firing
    // (throttled) in background tabs, so the awaits always resolve.
    let prog = 0
    const runStep = (i: number) => {
      if (real.on) return Promise.resolve()
      setActiveStep(i)
      const target = steps[i].end
      const duration = steps[i].delay
      const start = prog
      const startTime = Date.now()
      return new Promise<void>(res => {
        const iv = setInterval(() => {
          if (real.on) { clearInterval(iv); res(); return }
          const t = Math.min((Date.now() - startTime) / duration, 1)
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
          prog = start + (target - start) * ease
          setProgress(prog)
          if (t >= 1) { clearInterval(iv); res() }
        }, 50)
      })
    }

    const apiPromise = convertPdf(file, format, {
      onProgress: p => {
        if (p.phase === 'extracting' && p.chunksTotal) {
          real.on = true
          setActiveStep(1)
          setProgress(25 + 65 * ((p.chunksDone ?? 0) / p.chunksTotal))
        } else if (p.phase === 'building') {
          real.on = true
          setActiveStep(2)
          setProgress(93)
        }
      },
    })
    await runStep(0)
    runStep(1)

    let out: ConvertOutput
    try {
      out = await apiPromise
    } catch (e: any) {
      const isNetwork = !(e instanceof ConvertError)
      track('conversion_failed', { format, reason: isNetwork ? 'network_error' : (e.canTopup ? 'usage_limit' : 'extraction_error') })
      setStage('error')
      setError(isNetwork ? 'Network error. Check your connection.' : (e.message || 'Conversion failed.'))
      return
    }

    if (!real.on) runStep(2)
    setProgress(100); setActiveStep(3)
    await new Promise(r => setTimeout(r, 300))

    setResult({
      txCount: out.txCount, pages: out.pages, bank: out.bank, warning: out.warning,
      time: (out.timeMs / 1000).toFixed(1) + 's',
      blob: out.blob,
      filename: out.filenameOut,
    })
    track('conversion_complete', { format, pages: out.pages, txCount: out.txCount, bank: out.bank })
    setStage('done')
  }

  const download = () => {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url; a.download = result.filename; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFile(null); setStage('idle'); setProgress(0); setActiveStep(0); setResult(null); setError('')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
      {(stage === 'idle' || stage === 'error') && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            style={{
              padding: '40px 28px', margin: 20, textAlign: 'center', cursor: 'pointer', borderRadius: 12,
              border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: dragging ? 'var(--accent-bg)' : 'var(--surface-2)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 48, height: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            {file ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{file.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · PDF</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Drop your bank statement here</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>or <span style={{ color: 'var(--accent)' }}>browse files</span></div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 10 }}>PDF only · Max 25 MB · 100% private</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                 onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {showFormatPicker && (
            <div style={{ padding: '0 20px 16px' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>OUTPUT FORMAT</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {FORMATS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key)}
                    style={{
                      padding: '10px 12px',
                      background: format === f.key ? 'var(--accent-bg)' : 'transparent',
                      border: `1px solid ${format === f.key ? 'var(--accent-border)' : 'var(--border)'}`,
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Sora,sans-serif', color: format === f.key ? 'var(--accent)' : 'var(--text-dim)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{f.icon} {f.label}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ margin: '0 20px 14px', padding: '12px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={convert} disabled={!file}
              style={{
                width: '100%', padding: 14,
                background: file ? 'var(--accent)' : 'var(--surface-2)',
                color: file ? 'var(--on-accent)' : 'var(--text-faint)',
                fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 12, cursor: file ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s', boxShadow: file ? 'var(--shadow-glow)' : 'none',
              }}>
              {!user && !freeMode ? 'Sign in to convert →' : 'Convert now →'}
            </button>
          </div>
        </>
      )}

      {stage === 'converting' && (
        <div style={{ padding: 28 }}>
          {[
            { label: 'Uploading PDF', sub: 'Sending to secure server...' },
            { label: 'Reading pages', sub: 'Detecting bank format...' },
            { label: 'Extracting transactions', sub: 'Reading every row carefully...' },
            { label: 'Building output file', sub: 'Formatting & finalizing...' },
          ].map((s, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}>
                {i < 3 && <div style={{ position: 'absolute', left: 14, top: 38, width: 1, height: 'calc(100% - 14px)', background: done ? 'var(--accent-border)' : 'var(--border)' }} />}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: active ? '1.5px solid var(--accent)' : done ? 'none' : '1px solid var(--border-strong)',
                  background: active ? 'var(--accent-bg)' : done ? 'var(--accent)' : 'var(--surface-2)',
                  boxShadow: active ? '0 0 0 4px var(--accent-bg)' : 'none',
                }}>
                  {done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : active ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                    : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-faint)' }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: done ? 'var(--accent)' : active ? 'var(--text)' : 'var(--text-muted)' }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 11, color: done ? 'var(--accent-strong)' : active ? 'var(--text-muted)' : 'var(--text-faint)', marginTop: 2 }}>
                    {done ? '✓ Done' : active ? s.sub : 'Waiting...'}
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.3s ease', boxShadow: '0 0 8px var(--accent-glow)' }} />
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{Math.round(progress)}%</div>
          </div>
        </div>
      )}

      {stage === 'done' && result && (
        <div style={{ padding: 28, textAlign: 'center', animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ width: 64, height: 64, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Conversion complete</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
            {result.bank ? `${result.bank} • ` : ''}{result.txCount} transactions from {result.pages} {result.pages === 1 ? 'page' : 'pages'} in {result.time}
          </p>
          {result.warning && (
            <div style={{ margin: '0 0 20px', padding: '12px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 10, fontSize: 12.5, color: 'var(--warning)', textAlign: 'left', lineHeight: 1.5 }}>
              ⚠ {result.warning}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { v: result.txCount, l: 'Transactions' },
              { v: result.pages, l: 'Pages' },
              { v: result.time, l: 'Speed' },
            ].map(s => (
              <div key={s.l} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--accent)' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <button onClick={download}
            style={{ width: '100%', padding: 14, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 12, fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {format.toUpperCase()} file
          </button>
          <button onClick={reset} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>Convert another →</button>
        </div>
      )}
    </div>
  )
}
