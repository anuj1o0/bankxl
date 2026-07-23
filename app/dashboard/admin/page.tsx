import { notFound } from 'next/navigation'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/admin'

// Founder-only. Always server-rendered fresh (never static): it reads the live
// session and the service-role telemetry table.
export const dynamic = 'force-dynamic'

interface FailureRow {
  id: string
  created_at: string
  bank_detected: string | null
  page_count: number | null
  file_size_bytes: number | null
  failure_code: string
  failure_stage: string | null
  confidence: number | null
  reconciled_links: number | null
  checkable_links: number | null
  breaks: number | null
  transactions_extracted: number | null
  format_requested: string | null
  sample_shared: boolean
  sample_path: string | null
  resolved: boolean
}

const mono = { fontFamily: 'DM Mono, monospace' } as const
const cell: React.CSSProperties = { padding: '10px 14px', fontSize: 13, color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }
const th: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 10.5, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', ...mono }

function Card({ label, value, tone }: { label: string; value: string | number; tone?: 'accent' | 'warn' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: tone === 'accent' ? 'var(--accent)' : tone === 'warn' ? 'var(--warning)' : 'var(--text-strong)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Table({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-strong)' }}>{title}</h2>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
        </div>
      </div>
    </section>
  )
}

function fmtBytes(n: number | null): string {
  if (!n) return '—'
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminPage() {
  // Server-side gate — the real security boundary.
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) notFound()

  const sb = createServiceSupabase()
  const { data, error } = await sb
    .from('parser_failures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  const wrap: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '40px 28px 64px' }

  // Table missing (migration 003 not applied yet) — guide instead of crashing.
  if (error) {
    return (
      <div style={wrap}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Parser Failures</h1>
        <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 14, padding: 20, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--warning)' }}>Telemetry table not found.</strong> Run{' '}
          <code style={mono}>supabase/migrations/003_parser_failures.sql</code> in your Supabase SQL editor,
          then reload. Until then, failing conversions aren&apos;t recorded.
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>({error.message})</div>
        </div>
      </div>
    )
  }

  const rows = (data || []) as FailureRow[]
  const total = rows.length
  const unresolved = rows.filter(r => !r.resolved).length
  const shared = rows.filter(r => r.sample_shared && r.sample_path)

  // Aggregate the loaded window (most-recent 500) in JS.
  const byBank = new Map<string, number>()
  const byCode = new Map<string, number>()
  for (const r of rows) {
    const bank = r.bank_detected || '(not detected)'
    byBank.set(bank, (byBank.get(bank) || 0) + 1)
    const key = r.failure_stage ? `${r.failure_code} @ ${r.failure_stage}` : r.failure_code
    byCode.set(key, (byCode.get(key) || 0) + 1)
  }
  const topBanks = [...byBank.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  const topCodes = [...byCode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)

  // Signed download URLs for shared samples (1h expiry; private bucket).
  const samples = await Promise.all(
    shared.slice(0, 50).map(async r => {
      const { data: signed } = await sb.storage.from('failed-samples').createSignedUrl(r.sample_path!, 3600)
      return { row: r, url: signed?.signedUrl || null }
    })
  )

  return (
    <div style={wrap}>
      <div style={{ marginBottom: 8 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8 }}>ADMIN</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>Parser failures</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6, maxWidth: 620 }}>
          Statements the deterministic engine declined (most recent 500). Non-PII diagnostics only.
          Shared samples are files a user explicitly chose to send — download, fix the parser, then delete.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 22 }}>
        <Card label="Failures (last 500)" value={total} />
        <Card label="Unresolved" value={unresolved} tone={unresolved ? 'warn' : undefined} />
        <Card label="Shared samples" value={shared.length} tone={shared.length ? 'accent' : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 32 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-strong)' }}>Top failing banks</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {topBanks.length === 0 && <tr><td style={cell}>No failures recorded yet.</td></tr>}
                {topBanks.map(([bank, n]) => (
                  <tr key={bank}>
                    <td style={{ ...cell, color: 'var(--text)' }}>{bank}</td>
                    <td style={{ ...cell, textAlign: 'right', ...mono, color: 'var(--text)' }}>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-strong)' }}>Top failure reasons</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {topCodes.length === 0 && <tr><td style={cell}>No failures recorded yet.</td></tr>}
                {topCodes.map(([code, n]) => (
                  <tr key={code}>
                    <td style={{ ...cell, ...mono, fontSize: 12, color: 'var(--text)' }}>{code}</td>
                    <td style={{ ...cell, textAlign: 'right', ...mono, color: 'var(--text)' }}>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Table title={`Shared samples (${shared.length}) — real files to fix against`}>
        <thead><tr>
          <th style={th}>When</th><th style={th}>Bank</th><th style={th}>Pages</th>
          <th style={th}>Size</th><th style={th}>Status</th><th style={th}>File</th>
        </tr></thead>
        <tbody>
          {samples.length === 0 && <tr><td style={cell} colSpan={6}>No user has shared a sample yet.</td></tr>}
          {samples.map(({ row, url }) => (
            <tr key={row.id}>
              <td style={cell}>{fmtDate(row.created_at)}</td>
              <td style={{ ...cell, color: 'var(--text)' }}>{row.bank_detected || '—'}</td>
              <td style={{ ...cell, ...mono }}>{row.page_count ?? '—'}</td>
              <td style={{ ...cell, ...mono }}>{fmtBytes(row.file_size_bytes)}</td>
              <td style={cell}>{row.resolved ? '✅ resolved' : '⏳ open'}</td>
              <td style={cell}>
                {url
                  ? <a href={url} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Download PDF ↓</a>
                  : <span style={{ color: 'var(--text-faint)' }}>unavailable</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Table title="Recent failures">
        <thead><tr>
          <th style={th}>When</th><th style={th}>Bank</th><th style={th}>Reason</th>
          <th style={th}>Conf.</th><th style={th}>Recon</th><th style={th}>Pages</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td style={cell} colSpan={6}>Nothing recorded yet.</td></tr>}
          {rows.slice(0, 60).map(r => (
            <tr key={r.id}>
              <td style={cell}>{fmtDate(r.created_at)}</td>
              <td style={{ ...cell, color: 'var(--text)' }}>{r.bank_detected || '—'}</td>
              <td style={{ ...cell, ...mono, fontSize: 12 }}>
                {r.failure_stage ? `${r.failure_code} @ ${r.failure_stage}` : r.failure_code}
              </td>
              <td style={{ ...cell, ...mono }}>{r.confidence != null ? r.confidence.toFixed(2) : '—'}</td>
              <td style={{ ...cell, ...mono }}>
                {r.checkable_links != null ? `${r.reconciled_links ?? 0}/${r.checkable_links}` : '—'}
              </td>
              <td style={{ ...cell, ...mono }}>{r.page_count ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
