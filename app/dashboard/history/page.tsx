'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useDashboard, Conversion } from '@/components/dashboard/DashboardContext'
import TopBar from '@/components/dashboard/TopBar'
import BankIcon from '@/components/BankIcon'
import { Skeleton, SkeletonTableRow, GlobalSkeletonStyles } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'

const STALE_PENDING_MS = 3 * 60 * 1000  // anything stuck in pending >3 min is "abandoned" in the UI

interface DerivedConversion extends Conversion {
  derived_status: 'success' | 'failed' | 'processing' | 'abandoned'
}

const FORMATS = ['excel', 'csv', 'json', 'tally'] as const

const STATUS_BADGE = {
  success: { bg: 'var(--accent-bg-strong)', color: 'var(--accent)', border: 'var(--accent-border)', label: 'SUCCESS' },
  failed: { bg: 'var(--error-bg)', color: 'var(--error)', border: 'var(--error-border)', label: 'FAILED' },
  processing: { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)', label: 'PROCESSING' },
  abandoned: { bg: 'rgba(150,150,150,0.06)', color: 'var(--text-muted)', border: 'rgba(150,150,150,0.15)', label: 'ABANDONED' },
}

export default function HistoryPage() {
  const { conversions, refresh, loading, isPaid } = useDashboard()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'processing'>('all')
  const [bankFilter, setBankFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)

  // Derive a stable status that handles stuck rows on client side
  const derived: DerivedConversion[] = useMemo(() => {
    const now = Date.now()
    return conversions.map(c => {
      let derived_status: DerivedConversion['derived_status']
      if (c.status === 'success') derived_status = 'success'
      else if (c.status === 'failed') derived_status = 'failed'
      else {
        const ageMs = now - new Date(c.created_at).getTime()
        derived_status = ageMs > STALE_PENDING_MS ? 'abandoned' : 'processing'
      }
      return { ...c, derived_status }
    })
  }, [conversions])

  const stuckCount = derived.filter(c => c.derived_status === 'abandoned').length
  const activeCount = derived.filter(c => c.derived_status === 'processing').length

  // Auto-refresh every 4s while there are processing rows
  useEffect(() => {
    if (activeCount === 0) return
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [activeCount, refresh])

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return
    const onClick = () => setOpenMenu(null)
    setTimeout(() => document.addEventListener('click', onClick), 0)
    return () => document.removeEventListener('click', onClick)
  }, [openMenu])

  const banks = useMemo(() => {
    const set = new Set<string>()
    for (const c of conversions) if (c.bank_name) set.add(c.bank_name)
    return [...set].sort()
  }, [conversions])

  const filtered = useMemo(() => {
    return derived.filter(c => {
      if (filter === 'success' && c.derived_status !== 'success') return false
      if (filter === 'failed' && c.derived_status !== 'failed' && c.derived_status !== 'abandoned') return false
      if (filter === 'processing' && c.derived_status !== 'processing') return false
      if (bankFilter !== 'all' && c.bank_name !== bankFilter) return false
      if (search && !c.filename.toLowerCase().includes(search.toLowerCase()) &&
          !(c.bank_name || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [derived, filter, bankFilter, search])

  const totals = useMemo(() => {
    let tx = 0, pages = 0, debit = 0, credit = 0
    for (const c of filtered) {
      if (c.derived_status === 'success') {
        tx += c.transactions_extracted || 0
        pages += c.pages || 0
        debit += c.total_debit || 0
        credit += c.total_credit || 0
      }
    }
    return { tx, pages, debit, credit }
  }, [filtered])

  const exportCsv = () => {
    const head = ['Date', 'Filename', 'Bank', 'Format', 'Pages', 'Transactions', 'Total Debit', 'Total Credit', 'Time (ms)', 'Status']
    const rows = filtered.map(c => [
      new Date(c.created_at).toISOString(),
      JSON.stringify(c.filename),
      JSON.stringify(c.bank_name || ''),
      c.output_format || 'excel',
      c.pages,
      c.transactions_extracted,
      c.total_debit ?? 0,
      c.total_credit ?? 0,
      c.processing_time_ms || 0,
      c.derived_status,
    ].join(','))
    const blob = new Blob([head.join(',') + '\r\n' + rows.join('\r\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bankxl-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported', `${filtered.length} rows downloaded as CSV.`)
  }

  const redownload = (id: string, format: string) => {
    setOpenMenu(null)
    window.location.href = `/api/redownload/${id}?format=${format}`
  }

  const cleanupStuck = async () => {
    setCleaning(true)
    try {
      const res = await fetch('/api/conversions/cleanup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Cleaned up', `Marked ${data.cleaned} stuck conversion${data.cleaned === 1 ? '' : 's'} as abandoned.`)
        refresh()
      } else {
        toast.error('Cleanup failed', data.error || 'Try again in a moment.')
      }
    } catch {
      toast.error('Network error', 'Could not contact server.')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <>
      <GlobalSkeletonStyles />
      <TopBar title="History"
        subtitle={loading ? 'Loading...' : `${conversions.length} total · ${derived.filter(c => c.derived_status === 'success').length} successful`}
        cta={conversions.length > 0 ? { label: 'Export CSV', onClick: exportCsv } : undefined} />
      <div style={{ padding: 28, maxWidth: 1280 }}>

        {/* Cleanup banner */}
        {stuckCount > 0 && (
          <div style={{ marginBottom: 18, padding: 16, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{stuckCount} stuck conversion{stuckCount === 1 ? '' : 's'} found</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>These appear to have been abandoned. Click to clear them.</div>
              </div>
            </div>
            <button onClick={cleanupStuck} disabled={cleaning}
              style={{ padding: '8px 16px', background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: cleaning ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
              {cleaning ? 'Clearing...' : 'Clear stuck conversions'}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && conversions.length === 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 22 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: 16, background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 11 }}>
                  <Skeleton width={50} height={9} />
                  <div style={{ height: 12 }} />
                  <Skeleton width={70} height={22} radius={4} />
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12 }}>
              {[0, 1, 2].map(i => <SkeletonTableRow key={i} />)}
            </div>
          </>
        )}

        {/* Stats strip */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
            <StatCard label="SHOWING" value={filtered.length} sub="conversions" />
            <StatCard label="PAGES" value={totals.pages.toLocaleString('en-IN')} sub="processed" />
            <StatCard label="TRANSACTIONS" value={totals.tx.toLocaleString('en-IN')} sub="extracted" accent />
            <StatCard label="TOTAL DEBIT" value={`₹${(totals.debit / 1000).toFixed(0)}K`} color="var(--error)" sub={`₹${totals.debit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <StatCard label="TOTAL CREDIT" value={`₹${(totals.credit / 1000).toFixed(0)}K`} color="var(--accent)" sub={`₹${totals.credit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
          </div>
        )}

        {/* Filters */}
        {!loading && conversions.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by filename or bank..."
                style={{ width: '100%', padding: '11px 14px 11px 38px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 13, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value as any)}
              style={{ padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 13, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
              <option value="all">All status</option>
              <option value="success">Success</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
              style={{ padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 13, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
              <option value="all">All banks</option>
              {banks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {/* Empty state */}
        {!loading && conversions.length === 0 && (
          <div style={{ padding: 80, textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 18 }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 18px', borderRadius: 18, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            </div>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>No conversions yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Once you convert a bank statement, the full record appears here — searchable, filterable, and re-downloadable in any format.
            </p>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Convert your first PDF →
            </Link>
          </div>
        )}

        {/* No results */}
        {!loading && conversions.length > 0 && filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 14px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12 }}>No conversions match your filters.</p>
            <button onClick={() => { setSearch(''); setFilter('all'); setBankFilter('all') }}
              style={{ padding: '8px 16px', background: 'var(--hover)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              Clear filters
            </button>
          </div>
        )}

        {/* List */}
        {!loading && filtered.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'visible', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['File', 'Bank', 'Pages', 'Tx', 'Debit', 'Credit', 'Time', 'Status', 'Date', ''].map(h => (
                      <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 1, whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const badge = STATUS_BADGE[c.derived_status] ?? STATUS_BADGE.processing
                    const canRedownload = c.derived_status === 'success'
                    const isProcessing = c.derived_status === 'processing'
                    return (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--hover)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--zebra)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '14px 18px', maxWidth: 240, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BankIcon name={c.bank_name} size={28} />
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.filename}>{c.filename}</div>
                              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 1 }}>{c.output_format || 'excel'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontSize: 12 }}>{c.bank_name || '—'}</td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{c.pages || '—'}</td>
                        <td style={{ padding: '14px 18px', color: c.transactions_extracted ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{c.transactions_extracted || '—'}</td>
                        <td style={{ padding: '14px 18px', color: c.total_debit ? 'var(--error)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{c.total_debit ? `₹${c.total_debit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</td>
                        <td style={{ padding: '14px 18px', color: c.total_credit ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{c.total_credit ? `₹${c.total_credit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{c.processing_time_ms ? `${(c.processing_time_ms / 1000).toFixed(1)}s` : '—'}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontSize: 9, padding: '4px 9px', borderRadius: 20, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontFamily: 'DM Mono, monospace', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {isProcessing && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: 'bxl-pulse-small 1.5s infinite' }} />}
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', position: 'relative' }}>
                          {canRedownload && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? null : c.id) }} aria-label="Download"
                                style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                              </button>
                              {openMenu === c.id && (
                                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 18, top: '100%', marginTop: 4, background: 'var(--surface-elev)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: 4, zIndex: 10, boxShadow: 'var(--shadow-lg)', minWidth: 160 }}>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '8px 10px 4px', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>DOWNLOAD AS</div>
                                  {FORMATS.map(f => {
                                    const locked = !isPaid && f !== 'excel'
                                    return (
                                      <button key={f} onClick={() => !locked && redownload(c.id, f)} disabled={locked}
                                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'transparent', border: 'none', color: locked ? 'var(--text-faint)' : 'var(--text)', fontSize: 12, cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'Sora,sans-serif', borderRadius: 5, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        onMouseEnter={e => !locked && ((e.currentTarget as HTMLElement).style.background = 'var(--hover)')}
                                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                                        <span>{f}</span>
                                        {locked && <span style={{ fontSize: 8, padding: '1px 5px', background: 'var(--border)', borderRadius: 20, color: 'var(--text-muted)', letterSpacing: 0.5 }}>PRO</span>}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                          {(c.derived_status === 'failed' || c.derived_status === 'abandoned') && c.error_message && (
                            <span title={c.error_message} style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'help' }}>ⓘ</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes bxl-pulse-small {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  color?: string
}
function StatCard({ label, value, sub, accent, color }: StatCardProps) {
  return (
    <div className="card card-hover" style={{ padding: 16, borderRadius: 14 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      <div className="display" style={{ fontSize: 23, fontWeight: 700, color: color ?? (accent ? 'var(--accent)' : 'var(--text-strong)'), letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  )
}
