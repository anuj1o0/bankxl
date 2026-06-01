'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  overview: {
    totalUsers: number
    signupsToday: number
    signupsThisWeek: number
    signupsThisMonth: number
    totalConversions: number
    pagesThisMonth: number
    dayPassesTotal: number
    dayPassesThisMonth: number
    mrr: number
  }
  plans: { free: number; pro: number; firm: number }
  providers: { razorpay: number; lemonsqueezy: number }
  signupsByDay: Record<string, number>
  recentSignups: any[]
  recentConversions: any[]
  failedPayments: any[]
  topBanks: { bank: string; count: number }[]
  apiSuccessRate: number | null
}

interface Health {
  ok: boolean
  checkedAt: string
  services: Record<string, { ok: boolean; latencyMs?: number; detail?: string }>
}

function MetricCard({ label, value, sub, color = 'default' }: {
  label: string; value: string | number; sub?: string; color?: 'default' | 'green' | 'blue' | 'yellow' | 'red'
}) {
  const colors = {
    default: 'bg-[var(--card)] border-[var(--border)]',
    green:   'bg-emerald-500/10 border-emerald-500/30',
    blue:    'bg-blue-500/10 border-blue-500/30',
    yellow:  'bg-yellow-500/10 border-yellow-500/30',
    red:     'bg-red-500/10 border-red-500/30',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  )
}

function ago(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied. Set ADMIN_EMAIL env var to your email.'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed to load stats')
      setStats(await res.json())
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/health')
      if (res.ok) setHealth(await res.json())
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchHealth()
  }, [fetchStats, fetchHealth])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[var(--muted)] text-sm">Loading admin data…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
        <p className="text-red-400 font-medium mb-2">⚠️ {error}</p>
        <p className="text-sm text-[var(--muted)]">
          Add <code className="bg-[var(--card)] px-1 rounded">ADMIN_EMAIL=your@email.com</code> to your environment variables.
        </p>
      </div>
    </div>
  )

  if (!stats) return null
  const { overview, plans, providers, signupsByDay, recentSignups, recentConversions, failedPayments, topBanks, apiSuccessRate } = stats

  const maxSignups = Math.max(...Object.values(signupsByDay), 1)

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔒 BankXL Admin</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchHealth() }}
            className="px-4 py-2 text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Users"        value={overview.totalUsers.toLocaleString()} color="default" />
          <MetricCard label="Signups Today"      value={overview.signupsToday}  sub={`${overview.signupsThisWeek} this week`} color={overview.signupsToday > 0 ? 'green' : 'default'} />
          <MetricCard label="This Month"         value={overview.signupsThisMonth} sub="new signups" color="blue" />
          <MetricCard label="Est. MRR"           value={`₹${overview.mrr.toLocaleString()}`} sub={`Pro×${plans.pro} + Firm×${plans.firm}`} color={overview.mrr > 0 ? 'green' : 'default'} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Conversions"  value={overview.totalConversions.toLocaleString()} />
          <MetricCard label="Pages This Month"   value={overview.pagesThisMonth.toLocaleString()} />
          <MetricCard label="Day Passes (month)" value={overview.dayPassesThisMonth} sub={`${overview.dayPassesTotal} all time`} />
          <MetricCard label="API Success Rate"   value={apiSuccessRate !== null ? `${apiSuccessRate}%` : '—'} color={apiSuccessRate !== null && apiSuccessRate < 95 ? 'red' : 'default'} />
        </div>

        {/* Plan Distribution */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Free', count: plans.free,  color: 'bg-slate-400' },
              { label: 'Pro',  count: plans.pro,   color: 'bg-blue-500' },
              { label: 'Firm', count: plans.firm,  color: 'bg-emerald-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                </div>
              </div>
            ))}
          </div>
          {overview.totalUsers > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              {plans.free  > 0 && <div className="bg-slate-400"   style={{ flex: plans.free }} />}
              {plans.pro   > 0 && <div className="bg-blue-500"    style={{ flex: plans.pro }} />}
              {plans.firm  > 0 && <div className="bg-emerald-500" style={{ flex: plans.firm }} />}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-[var(--muted)]">
            <span>🇮🇳 Razorpay: {providers.razorpay}</span>
            <span>🌍 Lemon Squeezy: {providers.lemonsqueezy}</span>
          </div>
        </div>

        {/* Signups Sparkline (last 7 days) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold mb-4">Signups — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-24">
            {Object.entries(signupsByDay).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[var(--muted)]">{count > 0 ? count : ''}</span>
                <div
                  className="w-full rounded-t bg-emerald-500/70 transition-all"
                  style={{ height: `${Math.max((count / maxSignups) * 72, count > 0 ? 6 : 2)}px` }}
                />
                <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Signups + Recent Conversions */}
        <div className="grid md:grid-cols-2 gap-4">

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-semibold mb-3">Recent Signups</h2>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No signups yet.</p>
            ) : (
              <div className="space-y-2">
                {recentSignups.map(u => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.full_name || u.email}</p>
                      {u.full_name && <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.plan === 'firm' ? 'bg-emerald-500/20 text-emerald-400' :
                        u.plan === 'pro'  ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{u.plan}</span>
                      <span className="text-xs text-[var(--muted)]">{ago(u.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-semibold mb-3">Recent Conversions</h2>
            {recentConversions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No conversions yet.</p>
            ) : (
              <div className="space-y-2">
                {recentConversions.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.filename}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {c.bank_name || 'Unknown bank'} · {c.pages}p · {c.output_format?.toUpperCase()}
                        {c.processing_time_ms ? ` · ${(c.processing_time_ms/1000).toFixed(1)}s` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                        c.status === 'failed'  ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{c.status}</span>
                      <span className="text-xs text-[var(--muted)]">{ago(c.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Failed Payments */}
        {failedPayments.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
            <h2 className="font-semibold mb-3 text-red-400">⚠️ Failed Payments ({failedPayments.length})</h2>
            <div className="space-y-2">
              {failedPayments.map(u => (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--fg)]">{u.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">{u.plan} · {u.payment_provider}</span>
                    <span className="text-xs text-red-400">{ago(u.payment_failed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Banks */}
        {topBanks.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-semibold mb-4">Top Banks Used</h2>
            <div className="space-y-2">
              {topBanks.map(({ bank, count }) => (
                <div key={bank} className="flex items-center gap-3">
                  <span className="text-sm w-36 truncate">{bank}</span>
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(count / topBanks[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-[var(--muted)] w-10 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Health */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">API Health</h2>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="text-xs px-3 py-1.5 bg-[var(--border)] rounded-lg hover:opacity-80 disabled:opacity-50 transition"
            >
              {healthLoading ? 'Checking…' : '↻ Re-check'}
            </button>
          </div>
          {!health ? (
            <p className="text-sm text-[var(--muted)]">Loading health data…</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(health.services).map(([name, s]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusDot ok={s.ok} />
                    <span className="text-sm font-medium capitalize">{name}</span>
                    {s.detail && <span className="text-xs text-[var(--muted)] ml-2">— {s.detail}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.latencyMs && <span className="text-xs text-[var(--muted)]">{s.latencyMs}ms</span>}
                    <span className={`text-xs font-medium ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.ok ? '✓ OK' : '✗ Error'}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                Checked {ago(health.checkedAt)}
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--muted)] pb-4">
          BankXL Admin · Only visible to {process.env.NEXT_PUBLIC_ADMIN_HINT || 'admin'}
        </p>
      </div>
    </div>
  )
}
