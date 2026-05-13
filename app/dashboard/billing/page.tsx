'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import { useRazorpay, CheckoutResponse } from '@/components/useRazorpay'
import TopBar from '@/components/dashboard/TopBar'
import TopupButton from '@/components/dashboard/TopupButton'
import { useToast } from '@/components/Toast'
import { PLAN_LABELS } from '@/lib/supabase'

interface PlanOption {
  key: string             // plan_key — pro_monthly etc.
  name: string
  price: string
  priceUsd: string
  period: string
  conv: string
  tier: 'pro' | 'firm'
  cycle: 'monthly' | 'annual'
  best?: boolean
}

const ALL_PLANS: PlanOption[] = [
  { key: 'pro_monthly', name: 'Pro Monthly', price: '₹499', priceUsd: '$8', period: 'per month', conv: '800 pages', tier: 'pro', cycle: 'monthly', best: true },
  { key: 'pro_annual', name: 'Pro Annual', price: '₹4,999', priceUsd: '$80', period: 'per year', conv: '800/mo · save 17%', tier: 'pro', cycle: 'annual' },
  { key: 'firm_monthly', name: 'Firm Monthly', price: '₹4,999', priceUsd: '$50', period: 'per month', conv: '8,000 pages + bulk + team', tier: 'firm', cycle: 'monthly' },
  { key: 'firm_annual', name: 'Firm Annual', price: '₹49,999', priceUsd: '$500', period: 'per year', conv: '8,000/mo · save 17%', tier: 'firm', cycle: 'annual' },
]

function BillingInner() {
  const { profile, dayPass, isPaid, bonusPages, pagesUsed, pagesLimit, refresh } = useDashboard()
  const [loading, setLoading] = useState('')
  const toast = useToast()
  const { openCheckout, verifyPayment } = useRazorpay()
  const params = useSearchParams()

  // Auto-handle ?switch=plan_key param coming from pricing page
  useEffect(() => {
    const switchTo = params.get('switch')
    if (switchTo && profile?.razorpay_subscription_id && profile.plan !== 'free') {
      setTimeout(() => {
        if (confirm(`Switch to a new plan? Your current ${profile.plan} subscription will be cancelled immediately, and you'll pay for the new plan now. You'll lose any remaining days on your current cycle.`)) {
          switchPlan(switchTo)
        }
      }, 200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, profile?.razorpay_subscription_id])

  const subscribe = async (planKey: string) => {
    setLoading(planKey)
    let data: CheckoutResponse
    try {
      const res = await fetch('/api/razorpay/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      data = await res.json()
      if (!res.ok) { toast.error('Could not start checkout', (data as any).error); setLoading(''); return }
    } catch {
      toast.error('Network error', 'Check your connection.'); setLoading(''); return
    }

    try {
      await openCheckout(data, {
        onSuccess: async (success) => {
          try { await verifyPayment(success) } catch {}
          window.location.href = `/dashboard?upgraded=true&plan=${planKey}`
        },
        onDismiss: () => setLoading(''),
        onFailure: (err) => { toast.error('Payment failed', err); setLoading('') },
      })
    } catch (e: any) {
      toast.error('Could not open payment', e.message); setLoading('')
    }
  }

  const switchPlan = async (planKey: string) => {
    setLoading(planKey)
    let data: CheckoutResponse
    try {
      const res = await fetch('/api/razorpay/switch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      data = await res.json()
      if (!res.ok) {
        toast.error('Could not switch plan', (data as any).error)
        setLoading('')
        if ((data as any).redirectTo) window.location.href = (data as any).redirectTo
        return
      }
    } catch {
      toast.error('Network error', 'Check your connection.'); setLoading(''); return
    }

    try {
      await openCheckout(data, {
        onSuccess: async (success) => {
          try { await verifyPayment(success) } catch {}
          toast.success('Plan switched', 'Your new plan is now active.')
          window.location.href = `/dashboard?upgraded=true&plan=${planKey}`
        },
        onDismiss: () => {
          toast.info('Payment dismissed', 'Your old subscription was cancelled. Re-subscribe from Pricing when ready.')
          setLoading('')
          refresh()
        },
        onFailure: (err) => { toast.error('Payment failed', err); setLoading(''); refresh() },
      })
    } catch (e: any) {
      toast.error('Could not open payment', e.message); setLoading('')
    }
  }

  const syncWithRazorpay = async () => {
    setLoading('sync')
    try {
      const res = await fetch('/api/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),  // no params → server auto-finds user's active sub
      })
      const data = await res.json()
      if (res.ok && data.action === 'activated') {
        toast.success('Plan restored', `${data.plan === 'firm' ? 'Firm' : 'Pro'} plan is now active.`)
        await refresh()
      } else if (res.status === 404) {
        toast.info('No active subscription', data.error || 'Nothing to sync.')
      } else {
        toast.error('Sync failed', data.error || 'Try again or email support.')
      }
    } catch {
      toast.error('Network error', 'Check your connection.')
    } finally {
      setLoading('')
    }
  }

  const cancel = async () => {
    if (!confirm('Cancel your subscription? You\'ll keep access until the end of your current billing period.')) return
    setLoading('cancel')
    try {
      const res = await fetch('/api/razorpay/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ immediate: false }) })
      const data = await res.json()
      if (res.ok) {
        toast.success('Subscription cancelled', data.message || 'Access continues until end of current period.')
        refresh()
      } else {
        toast.error('Cancel failed', data.error || 'Email support@bankxl.in')
      }
    } catch {
      toast.error('Network error', 'Try again.')
    } finally {
      setLoading('')
    }
  }

  const planLabel = PLAN_LABELS[profile?.plan as keyof typeof PLAN_LABELS] || 'Free'
  const currentPlanKey = profile?.plan_key
  // Only consider truly subscribed if BOTH the sub_id exists AND the plan is actually paid
  const isSubscribed = !!profile?.razorpay_subscription_id && (profile.plan === 'pro' || profile.plan === 'firm')

  // Filter available plans: hide the EXACT plan the user is currently on (by plan_key)
  const availablePlans = ALL_PLANS.filter(p => {
    if (!isSubscribed) return true
    return p.key !== currentPlanKey
  })

  return (
    <>
      <TopBar title="Billing" subtitle="Manage your subscription, payment method and invoices" />
      <div style={{ padding: 28, maxWidth: 880 }}>
        {/* Current plan card */}
        <div style={{ background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-bg))', border: '1px solid var(--accent-border)', borderRadius: 14, padding: 24, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 }}>CURRENT PLAN</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 32, fontWeight: 600 }}>{planLabel}</span>
                {currentPlanKey && (
                  <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                    · {ALL_PLANS.find(p => p.key === currentPlanKey)?.price || ''}/{ALL_PLANS.find(p => p.key === currentPlanKey)?.cycle === 'annual' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
                {profile?.plan === 'free' ? '50 pages / month included' :
                  profile?.plan === 'pro' ? '800 pages / month, all formats' :
                  '8,000 pages / month + bulk + team + white-label'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
                Used: {pagesUsed} / {pagesLimit + (bonusPages || 0)} pages
                {bonusPages > 0 && <span style={{ color: 'var(--accent)' }}> (+{bonusPages} bonus)</span>}
              </div>
              {profile?.subscription_ends_at && profile.plan !== 'free' && (
                <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
                  Ends {new Date(profile.subscription_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {profile?.plan === 'free' ? (
                <>
                  <button onClick={() => subscribe('pro_monthly')} disabled={!!loading}
                    style={{ padding: '11px 20px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    {loading === 'pro_monthly' ? 'Loading...' : 'Upgrade to Pro →'}
                  </button>
                  <button onClick={syncWithRazorpay} disabled={!!loading} title="If you paid but plan didn't update"
                    style={{ padding: '11px 16px', background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--border-strong)', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    {loading === 'sync' ? 'Syncing...' : '↻ Sync with Razorpay'}
                  </button>
                </>
              ) : isSubscribed ? (
                <button onClick={cancel} disabled={!!loading}
                  style={{ padding: '11px 20px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                  {loading === 'cancel' ? 'Cancelling...' : 'Cancel subscription'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Top-up — always available for paid users */}
        {isPaid && (
          <div style={{ padding: 18, background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📈</span> Need extra pages?
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                Top-up <strong style={{ color: 'var(--accent)' }}>₹100</strong> for <strong style={{ color: 'var(--accent)' }}>60 pages</strong> — added instantly. Expires on the 1st of next month.
              </div>
            </div>
            <TopupButton variant="secondary" />
          </div>
        )}

        {/* Day pass info */}
        {dayPass && (
          <div style={{ padding: 18, background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>⚡ Active Day Pass</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                {dayPass.conversions_remaining} pages remaining · expires {new Date(dayPass.expires_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        )}

        {/* Available plans */}
        {availablePlans.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {isSubscribed ? 'Switch plan' : 'Available plans'}
            </h2>
            {isSubscribed && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.6 }}>
                Switching cancels your current subscription <strong>immediately</strong> and starts the new plan. You won't be billed twice, but you'll lose any remaining days on the current cycle.
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {availablePlans.map(p => (
                <div key={p.key} style={{ background: 'var(--zebra)', border: `1px solid ${p.best ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12, padding: 18, position: 'relative' }}>
                  {p.best && <span style={{ position: 'absolute', top: -10, left: 16, fontSize: 9, padding: '2px 8px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 20, fontFamily: 'DM Mono, monospace', fontWeight: 600, letterSpacing: 0.5 }}>BEST VALUE</span>}
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>{p.price}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{p.period} · ≈ {p.priceUsd}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>{p.conv}</div>
                  <button
                    onClick={() => isSubscribed ? switchPlan(p.key) : subscribe(p.key)}
                    disabled={!!loading}
                    style={{ width: '100%', padding: 9, background: p.best ? 'var(--accent)' : 'var(--surface-2)', color: p.best ? 'var(--on-accent)' : 'var(--text)', border: p.best ? 'none' : '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
                    {loading === p.key ? 'Loading...' : isSubscribed ? 'Switch to this' : 'Choose'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Invoices & receipts</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 12 }}>
            Razorpay automatically emails a GST-compliant invoice for every payment. Check your inbox after each charge — these are your tax-ready receipts.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            Need a custom invoice with your business name, PAN, or GSTIN? Email <a href="mailto:support@bankxl.in" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@bankxl.in</a> with your payment reference.
          </p>
        </div>

        <div style={{ marginTop: 22, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Questions about billing? Email <a href="mailto:support@bankxl.in" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@bankxl.in</a> · See <Link href="/refund" style={{ color: 'var(--accent)', textDecoration: 'none' }}>refund policy</Link>
        </div>
      </div>
    </>
  )
}

export default function BillingPage() {
  return <Suspense fallback={null}><BillingInner /></Suspense>
}
