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

  return (
    <>
      <TopBar
        title={`Welcome${firstName ? `, ${firstName}` : ''}`}
        subtitle={isTeamMember ? "Using your team's Firm plan" : 'Convert a bank statement, view your history, manage your account'}
      />
      <div style={{ padding: 28, maxWidth: 1280 }}>

        {upgraded && (
          <div style={{
            padding: 18, marginBottom: 22,
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Upgrade successful</div>
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>Your new plan is now active. Welcome aboard.</div>
            </div>
          </div>
        )}

        <Onboarding name={firstName} isFirstUse={isFirstUse} />

        {showTopupBanner && (
          <div style={{ padding: 16, marginBottom: 22, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
            value={pagesUsed.toLocaleString('en-IN')}
            sub={`of ${limitDisplay}${bonusPages > 0 ? ` (+${bonusPages} bonus)` : ''}`}
            extra={`${remainingDisplay} left`}
            accent
            icon="📊"
            progress={Math.min((pagesUsed / pagesEffectiveLimit) * 100, 100)}
          />
          <StatCard label="Successful" value={conversions.filter(c => c.status === 'success').length} sub="all-time conversions" icon="✓" />
          <StatCard label="Day pass" value={dayPass ? dayPass.conversions_remaining : '—'} sub={dayPass ? 'pages left' : 'No active pass'} icon="⚡" />
          <StatCard label="Plan" value={effectivePlan === 'free' ? 'Free' : effectivePlan === 'pro' ? 'Pro' : 'Firm'} sub={isTeamMember ? 'via team' : 'active'} icon="💎" />
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
              <div style={{ padding: 36, textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border-strong)', borderRadius: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>📋</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>No conversions yet</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your first one will appear here</div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {recent.map(c => (
                  <div key={c.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BankIcon name={c.bank_name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.filename}>{c.filename}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {c.pages || '—'} pg · {c.transactions_extracted || 0} tx · {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                      background: c.status === 'success' ? 'var(--accent-bg)' : c.status === 'pending' ? 'var(--warning-bg)' : 'var(--error-bg)',
                      color: c.status === 'success' ? 'var(--accent)' : c.status === 'pending' ? 'var(--warning)' : 'var(--error)',
                      fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                      border: `1px solid ${c.status === 'success' ? 'var(--accent-border)' : c.status === 'pending' ? 'var(--warning-border)' : 'var(--error-border)'}`,
                    }}>{c.status === 'pending' ? 'PROCESSING' : c.status === 'success' ? 'OK' : 'FAILED'}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
              {!isPaid && (
                <SidePanelCta icon="⚡" title="Need more pages?" desc={<>Pro is just <strong style={{ color: 'var(--accent)' }}>₹299/mo</strong> for 5,000 pages and all 4 export formats.</>} cta="Upgrade to Pro" href="/pricing" primary />
              )}
              {isPaid && <SidePanelCta icon="📦" title="Bulk upload" desc="Process up to 50 statements in one batch. They run in the background — feel free to navigate away." cta="Bulk convert →" href="/dashboard/bulk" />}
              {isFirm && <SidePanelCta icon="👥" title="Team seats" desc="Invite up to 5 team members. They share your unlimited Firm plan automatically." cta="Manage team →" href="/dashboard/team" />}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 1100px) {
          .bxl-grid-split, .bxl-top-row { grid-template-columns: 1fr !important; }
        }
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
  icon?: string
  progress?: number
}
function StatCard({ label, value, sub, extra, accent, icon, progress }: StatCardProps) {
  return (
    <div style={{
      background: accent ? 'linear-gradient(135deg, var(--accent-bg), transparent)' : 'var(--surface)',
      border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 12, padding: 18, position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s',
      boxShadow: 'var(--shadow-sm)',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}>
      {icon && <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 16, opacity: 0.5 }}>{icon}</div>}
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: accent ? 'var(--accent)' : 'var(--text-strong)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>{sub}{extra && <span> · <span style={{ color: 'var(--accent)' }}>{extra}</span></span>}</div>}
      {progress !== undefined && (
        <div style={{ marginTop: 10, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: progress >= 90 ? 'var(--error)' : 'var(--accent)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
        </div>
      )}
    </div>
  )
}

function SidePanelCta({ icon, title, desc, cta, href, primary }: { icon: string; title: string; desc: any; cta: string; href: string; primary?: boolean }) {
  return (
    <div style={{
      padding: 18,
      background: primary ? 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))' : 'var(--surface)',
      border: `1px solid ${primary ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 12,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
      <Link href={href} style={{
        display: 'block', textAlign: 'center', padding: 9,
        background: primary ? 'var(--accent)' : 'var(--surface-2)',
        color: primary ? 'var(--on-accent)' : 'var(--text)',
        borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
        border: primary ? 'none' : '1px solid var(--border)',
      }}>{cta}</Link>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardHome /></Suspense>
}
