'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import TopBar from '@/components/dashboard/TopBar'
import InAppConverter from '@/components/dashboard/InAppConverter'
import InsightsCard from '@/components/dashboard/InsightsCard'
import UsageChart from '@/components/dashboard/UsageChart'
import Onboarding from '@/components/dashboard/Onboarding'
import BankIcon from '@/components/BankIcon'
import TopupButton from '@/components/dashboard/TopupButton'
import AnimatedNumber from '@/components/AnimatedNumber'

const SI = {
  pages: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  gem: <><polygon points="6 3 18 3 22 9 12 22 2 9"/><path d="M2 9h20"/><path d="M12 22 8 9l4-6"/><path d="m12 22 4-13-4-6"/></>,
  box: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  sparkle: <><path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z"/></>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
}

const Ic = ({ children, size = 16 }: { children: any; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function DashboardHome() {
  const { profile, conversions, dayPass, pagesUsed, pagesLimit, pagesEffectiveLimit, bonusPages, pagesRemaining, isPaid, isFirm, isTeamMember, effectivePlan } = useDashboard()
  const params = useSearchParams()
  const upgraded = params.get('upgraded') === 'true'

  const recent = conversions.slice(0, 5)
  const firstName = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || ''
  const limitDisplay = pagesEffectiveLimit.toLocaleString('en-IN')
  const remainingDisplay = pagesRemaining.toLocaleString('en-IN')
  const isFirstUse = conversions.length === 0
  const usagePct = pagesEffectiveLimit > 0 ? (pagesUsed / pagesEffectiveLimit) * 100 : 0
  const showTopupBanner = isPaid && usagePct >= 75 && pagesRemaining < 200
  const successCount = conversions.filter(c => c.status === 'success').length

  return (
    <>
      <TopBar
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        subtitle={isTeamMember ? "Using your team's Firm plan" : 'Convert a statement, check your history, manage your account'}
      />
      <div style={{ padding: 28, maxWidth: 1280 }}>

        {upgraded && (
          <div className="anim-pop" style={{
            padding: 18, marginBottom: 22,
            background: 'linear-gradient(120deg, var(--accent-bg), var(--info-bg))',
            border: '1px solid var(--accent-border)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Ic size={20}>{SI.sparkle}</Ic>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Upgrade successful</div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>Your new plan is now active. Welcome aboard.</div>
            </div>
          </div>
        )}

        <Onboarding name={firstName} isFirstUse={isFirstUse} />

        {showTopupBanner && (
          <div style={{ padding: 16, marginBottom: 22, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>You've used {Math.round(usagePct)}% of this month's pages</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {pagesRemaining} pages left. Buy ₹100 / 60 pages to keep converting until next month.
                </div>
              </div>
            </div>
            <TopupButton variant="primary" />
          </div>
        )}

        {!isFirstUse && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, marginBottom: 22 }} className="bxl-top-row">
            <InsightsCard conversions={conversions} />
            <UsageChart conversions={conversions} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard
            label="Pages this month"
            value={pagesUsed}
            sub={`of ${limitDisplay}${bonusPages > 0 ? ` (+${bonusPages} bonus)` : ''}`}
            extra={`${remainingDisplay} left`}
            accent
            icon={SI.pages}
            progress={Math.min((pagesUsed / pagesEffectiveLimit) * 100, 100)}
          />
          <StatCard label="Successful" value={successCount} sub="all-time conversions" icon={SI.check} />
          <StatCard label="Day pass" value={dayPass ? dayPass.conversions_remaining : '—'} sub={dayPass ? 'pages left' : 'No active pass'} icon={SI.zap} />
          <StatCard label="Plan" value={effectivePlan === 'free' ? 'Free' : effectivePlan === 'pro' ? 'Pro' : 'Firm'} sub={isTeamMember ? 'via team' : 'active'} icon={SI.gem} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 22 }} className="bxl-grid-split">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Convert a statement</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontSize: 10, padding: '2px 6px', background: 'var(--kbd-bg)', borderRadius: 4, fontFamily: 'DM Mono, monospace', border: '1px solid var(--kbd-border)', color: 'var(--text-muted)' }}>⌘ K</kbd>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>for shortcuts</span>
              </div>
            </div>
            <InAppConverter />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Recent activity</h2>
              <Link href="/dashboard/history" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 14 }}>
                <div style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
                  <Ic size={22}>{SI.inbox}</Ic>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>No conversions yet</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your first one will appear here</div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {recent.map((c, i) => (
                  <div key={c.id} className="bxl-activity-row" style={{ padding: '12px 14px', borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BankIcon name={c.bank_name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.filename}>{c.filename}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {c.pages || '—'} pg · {c.transactions_extracted || 0} tx · {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: c.status === 'success' ? 'var(--accent-bg)' : c.status === 'pending' ? 'var(--warning-bg)' : 'var(--error-bg)',
                      color: c.status === 'success' ? 'var(--accent)' : c.status === 'pending' ? 'var(--warning)' : 'var(--error)',
                      fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                      border: `1px solid ${c.status === 'success' ? 'var(--accent-border)' : c.status === 'pending' ? 'var(--warning-border)' : 'var(--error-border)'}`,
                    }}>
                      {c.status === 'pending' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.2s ease infinite' }} />}
                      {c.status === 'pending' ? 'PROCESSING' : c.status === 'success' ? 'OK' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              {!isPaid && (
                <SidePanelCta icon={SI.zap} title="Need more pages?" desc={<>Pro is <strong style={{ color: 'var(--accent)' }}>₹499/mo</strong> for 800 pages and all 4 export formats.</>} cta="Upgrade to Pro" href="/pricing" primary />
              )}
              {isPaid && <SidePanelCta icon={SI.box} title="Bulk upload" desc="Process up to 50 statements in one batch. They run in the background — feel free to navigate away." cta="Bulk convert →" href="/dashboard/bulk" />}
              {isFirm && <SidePanelCta icon={SI.team} title="Team seats" desc="Invite up to 5 team members. They share your Firm plan automatically." cta="Manage team →" href="/dashboard/team" />}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 1100px) {
          .bxl-grid-split, .bxl-top-row { grid-template-columns: 1fr !important; }
        }
        .bxl-activity-row { transition: background 0.15s; }
        .bxl-activity-row:hover { background: var(--hover); }
      `}</style>
    </>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  extra?: string
  accent?: boolean
  icon?: any
  progress?: number
}
function StatCard({ label, value, sub, extra, accent, icon, progress }: StatCardProps) {
  const numeric = typeof value === 'number'
  return (
    <div className="card card-hover" style={{
      background: accent ? 'linear-gradient(135deg, var(--accent-bg), var(--surface))' : 'var(--surface)',
      borderColor: accent ? 'var(--accent-border)' : 'var(--border)',
      borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden',
    }}>
      {icon && (
        <div style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 10, background: accent ? 'var(--accent-bg)' : 'var(--surface-2)', border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent ? 'var(--accent)' : 'var(--text-muted)' }}>
          <Ic>{icon}</Ic>
        </div>
      )}
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>{label}</div>
      <div className="display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: accent ? 'var(--accent)' : 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {numeric ? <AnimatedNumber end={value as number} format={n => Math.round(n).toLocaleString('en-IN')} /> : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>{sub}{extra && <span> · <span style={{ color: 'var(--accent)' }}>{extra}</span></span>}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 10, height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: progress >= 90 ? 'var(--error)' : 'var(--gradient-brand)', width: `${progress}%`, borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.21, 0.6, 0.35, 1)' }} />
        </div>
      )}
    </div>
  )
}

function SidePanelCta({ icon, title, desc, cta, href, primary }: { icon: any; title: string; desc: any; cta: string; href: string; primary?: boolean }) {
  return (
    <div className="card" style={{
      padding: 18,
      background: primary ? 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))' : 'var(--surface)',
      borderColor: primary ? 'var(--accent-border)' : 'var(--border)',
      borderRadius: 16,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
          <Ic>{icon}</Ic>
        </span>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
      <Link href={href} style={{
        display: 'block', textAlign: 'center', padding: 9,
        background: primary ? 'var(--accent)' : 'var(--surface-2)',
        color: primary ? 'var(--on-accent)' : 'var(--text)',
        borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none',
        border: primary ? 'none' : '1px solid var(--border)',
        boxShadow: primary ? 'var(--shadow-glow)' : 'none',
      }}>{cta}</Link>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardHome /></Suspense>
}
