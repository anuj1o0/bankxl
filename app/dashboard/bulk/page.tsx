'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useConversions } from '@/components/dashboard/ConversionsContext'
import TopBar from '@/components/dashboard/TopBar'

const FORMATS = [
  { key: 'excel', label: 'Excel', sub: '.xlsx' },
  { key: 'csv', label: 'CSV', sub: '.csv' },
  { key: 'json', label: 'JSON', sub: '.json' },
  { key: 'tally', label: 'Tally XML', sub: '.xml' },
] as const

export default function BulkPage() {
  const { isPaid } = useDashboard()
  const { jobs, startJob, download, dismiss, clearAll } = useConversions()
  const [files, setFiles] = useState<File[]>([])
  const [running, setRunning] = useState(false)
  const [format, setFormat] = useState<'excel' | 'csv' | 'json' | 'tally'>('excel')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!isPaid) {
    return (
      <>
        <TopBar title="Bulk Upload" subtitle="Pro feature" />
        <div style={{ padding: 28, maxWidth: 720 }}>
          <div style={{ padding: 56, textAlign: 'center', background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-bg))', border: '1px solid var(--accent-border)', borderRadius: 18 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.02em' }}>Bulk upload is a Pro feature</h2>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Convert up to 50 PDFs in one go with the Pro plan. Drop a folder of statements and walk away — we'll process them sequentially in the background.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/pricing" style={{ padding: '12px 28px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px var(--accent-border)' }}>
                Upgrade to Pro — ₹299/mo
              </Link>
              <Link href="/dashboard" style={{ padding: '12px 28px', background: 'var(--hover)', color: 'var(--text)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border-strong)' }}>
                Back to converter
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.pdf') && f.size <= 25 * 1024 * 1024)
    setFiles(prev => [...prev, ...arr].slice(0, 50))
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const startAll = async () => {
    if (running || !files.length) return
    setRunning(true)
    for (const f of files) {
      startJob(f, format)
      await new Promise(r => setTimeout(r, 200)) // small stagger so UI feels alive
    }
    setFiles([])
    setRunning(false)
  }

  const downloadAll = () => {
    for (const j of jobs) {
      if (j.status === 'done' && !j.downloaded) download(j.id)
    }
  }

  const doneCount = jobs.filter(j => j.status === 'done').length

  return (
    <>
      <TopBar title="Bulk Upload" subtitle={`Process up to 50 statements at once · ${jobs.length + files.length} in pipeline`} />
      <div style={{ padding: 28, maxWidth: 1100 }}>
        <div style={{ display: 'grid', gap: 18 }}>

          {/* Format picker */}
          <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 22 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 1 }}>OUTPUT FORMAT (APPLIED TO ALL)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {FORMATS.map(f => (
                <button key={f.key} onClick={() => setFormat(f.key)}
                  style={{
                    padding: '12px 14px',
                    background: format === f.key ? 'var(--accent-bg-strong)' : 'var(--zebra)',
                    border: `1px solid ${format === f.key ? 'var(--accent-border)' : 'var(--border)'}`,
                    borderRadius: 9, cursor: 'pointer',
                    fontFamily: 'Sora,sans-serif',
                    color: format === f.key ? 'var(--accent)' : 'var(--text-dim)',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{f.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
            style={{
              padding: '48px 28px', textAlign: 'center', cursor: 'pointer', borderRadius: 12,
              border: `1.5px dashed ${dragging ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
              background: dragging ? 'var(--accent-bg)' : 'var(--zebra)',
              transition: 'all 0.2s',
            }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Drop multiple PDFs here</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>or <span style={{ color: 'var(--accent)' }}>browse files</span></div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 10 }}>PDF only · Max 50 files · Max 25 MB each</div>
            <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
              onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>

          {/* Pending list */}
          {files.length > 0 && (
            <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Ready to convert · {files.length} files</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setFiles([])} disabled={running}
                    style={{ padding: '8px 14px', background: 'var(--hover)', color: 'var(--text-dim)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    Clear
                  </button>
                  <button onClick={startAll} disabled={running}
                    style={{ padding: '8px 18px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: running ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    {running ? 'Starting...' : `Start all (${files.length})`}
                  </button>
                </div>
              </div>
              {files.map((f, idx) => (
                <div key={idx} style={{ padding: '12px 18px', borderTop: '1px solid var(--hover)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(f.size / (1024 * 1024)).toFixed(2)} MB</div>
                  </div>
                  <button onClick={() => removeFile(idx)} aria-label="Remove"
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--hover)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* In progress / done */}
          {jobs.length > 0 && (
            <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Active · <span style={{ color: 'var(--accent)' }}>{doneCount}</span>/<span style={{ color: 'var(--text-dim)' }}>{jobs.length}</span> done
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {doneCount > 0 && (
                    <button onClick={downloadAll}
                      style={{ padding: '8px 14px', background: 'var(--accent-bg-strong)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                      Download all ({doneCount})
                    </button>
                  )}
                  <button onClick={clearAll}
                    style={{ padding: '8px 14px', background: 'var(--hover)', color: 'var(--text-dim)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    Clear done
                  </button>
                </div>
              </div>
              {jobs.map(j => (
                <div key={j.id} style={{ padding: '12px 18px', borderTop: '1px solid var(--hover)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.filename}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {j.status === 'done' ? `${j.bank ? j.bank + ' · ' : ''}${j.txCount} tx · ${j.format.toUpperCase()}`
                        : j.status === 'error' ? `Error: ${j.error}`
                        : `${j.status === 'extracting' ? 'Reading transactions' : j.status === 'uploading' ? 'Uploading' : 'Processing'}... ${Math.round(j.progress)}%`}
                    </div>
                  </div>
                  {j.status === 'done' && !j.downloaded && (
                    <button onClick={() => download(j.id)}
                      style={{ padding: '6px 12px', background: 'var(--accent-bg-strong)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                      Download
                    </button>
                  )}
                  {j.status === 'done' && j.downloaded && (
                    <span style={{ fontSize: 10, color: 'var(--accent)' }}>✓ Downloaded</span>
                  )}
                  {j.status !== 'done' && j.status !== 'error' && (
                    <span style={{ fontSize: 9, padding: '3px 9px', borderRadius: 20, background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5 }}>
                      RUNNING
                    </span>
                  )}
                  {j.status === 'error' && (
                    <button onClick={() => dismiss(j.id)} style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--hover)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
