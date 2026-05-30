'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useRazorpay, CheckoutResponse } from '@/components/useRazorpay'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

interface UserPlanState {
  plan: 'free' | 'pro' | 'firm'
  planKey: string | null
  hasActiveSubscription: boolean
  paymentProvider: 'razorpay' | 'lemonsqueezy' | null
}

type Cycle = 'monthly' | 'annual'

// ─── Tier definitions (currency-agnostic) ───────────────────────────────────
const TIERS = (cycle: Cycle, isIndia: boolean) => ([
  {
    key: 'free',
    name: 'Free',
    price: '0',
    symbol: '',
    period: 'forever',
    pages: '50 pages / month',
    desc: 'Try BankXL with no commitment.',
    features: ['50 pages every month', 'Excel format', 'All Indian & global banks', 'Basic support'],
    cta: 'Start free',
    href: '/login?signup=true',
    planKey: null,
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: isIndia
      ? (cycle === 'monthly' ? '499' : '4,999')
      : (cycle === 'monthly' ? '8' : '80'),
    symbol: isIndia ? '₹' : '$',
    period: cycle === 'monthly' ? 'month' : 'year',
    pages: '800 pages / month',
    sub: cycle === 'annual'
      ? (isIndia ? 'Equiv. ₹417/mo · save 17%' : 'Equiv. $6.67/mo · save 17%')
      : undefined,
    desc: 'For active accountants and bookkeepers.',
    features: [
      '800 pages / month',
      'Excel + CSV + JSON + Tally XML',
      'All Indian & global banks',
      'Conversion history (90 days)',
      'Re-download in any format',
      'Priority processing',
      isIndia ? 'Top-up: ₹100 for 60 extra pages' : 'Top-up: $1.20 for 60 extra pages',
    ],
    cta: 'Get Pro',
    planKey: cycle === 'monthly' ? 'pro_monthly' : 'pro_annual',
    highlight: true,
    badge: 'Most popular',
  },
  {
    key: 'firm',
    name: 'Firm',
    price: isIndia
      ? (cycle === 'monthly' ? '4,999' : '49,999')
      : (cycle === 'monthly' ? '59' : '590'),
    symbol: isIndia ? '₹' : '$',
    period: cycle === 'monthly' ? 'month' : 'year',
    pages: '8,000 pages / month',
    sub: cycle === 'annual'
      ? (isIndia ? 'Equiv. ₹4,167/mo · save 17%' : 'Equiv. $49/mo · save 17%')
      : undefined,
    desc: 'For CA firms and finance teams.',
    features: [
      '8,000 pages / month',
      'Everything in Pro',
      '5 team seats included',
      'Bulk ZIP upload (50 files)',
      'White-label Excel (your firm name)',
      'Dedicated support + onboarding',
    ],
    cta: 'Get Firm',
    planKey: cycle === 'monthly' ? 'firm_monthly' : 'firm_annual',
    highlight: false,
  },
])

const FAQ = [
  { q: 'Why pages instead of conversions?', a: 'A 1-page statement and a 50-page statement use very different amounts of compute. Charging per page is the fairest way — you pay for what you actually consume. Most CAs find 50 free pages enough to handle 5–10 small statements every month.' },
  { q: 'How many pages does a typical statement have?', a: 'Most monthly statements are 3–8 pages. Quarterly is 8–20. Yearly is 25–60. So Pro\'s 800 pages handles roughly 100 small statements per month, and Firm\'s 8,000 pages handles 1,000+.' },
  { q: 'What if I run out of pages mid-month?', a: 'Buy a top-up: ₹100 (~$1.20) for 60 extra pages. They\'re added to your current month\'s allowance instantly. Top-ups expire on the 1st of next month along with your regular allowance — they don\'t carry over.' },
  { q: 'What payment methods do you accept?', a: 'For India: UPI, all Indian credit/debit cards, netbanking, and wallets (PhonePe, Paytm, Amazon Pay) via Razorpay. For international users: all major credit/debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and more via Lemon Squeezy.' },
  { q: 'How does auto-renewal work?', a: 'For Pro/Firm subscriptions, your card is charged automatically each month/year. You can cancel anytime from your Billing page and keep access until the end of your billing period.' },
  { q: 'Can I switch plans?', a: 'Yes — go to Billing → "Switch to this" on any plan. Your current subscription stays active until your new payment is confirmed. If you dismiss the window, nothing changes.' },
  { q: 'Do you generate invoices?', a: 'Yes. Indian users get GST-compliant invoices via Razorpay. International users get invoices via Lemon Squeezy. Email support@bankxl.in if you need a custom invoice.' },
  { q: 'Refunds?', a: 'If our tool genuinely doesn\'t work for your statements, email us within 7 days for a full refund. See our refund policy.' },
]

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<UserPlanState | null>(null)
  const [loading, setLoading] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  // Country detection — default India so there's no layout flash for most users
  const [isIndia, setIsIndia] = useState(true)
  const [geoLoading, setGeoLoading] = useState(true)
  const router = useRouter()
  const { openCheckout, verifyPayment } = useRazorpay()

  // Load user session + plan
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        try {
          const res = await fetch('/api/usage', { cache: 'no-store' })
          if (res.ok) {
            const u = await res.json()
            setUserPlan({
              plan: u.profile?.plan || 'free',
              planKey: u.profile?.plan_key || null,
              hasActiveSubscription: !!(u.profile?.razorpay_subscription_id || u.profile?.ls_subscription_id),
              paymentProvider: u.profile?.payment_provider || null,
            })
          }
        } catch {}
      }
    })
  }, [])

  // Detect country (non-blocking — page renders instantly with India defaults)
  useEffect(() => {
    fetch('/api/geo')
      .then(r => r.json())
      .then(({ country }) => {
        setIsIndia(country === 'IN')
      })
      .catch(() => { /* keep India default */ })
      .finally(() => setGeoLoading(false))
  }, [])

  const tiers = TIERS(cycle, isIndia)

  // ─── Razorpay checkout (India) ─────────────────────────────────────────────
  const startRazorpayCheckout = async (planKey: string) => {
    setLoading(planKey)
    let data: CheckoutResponse
    try {
      const res = await fetch('/api/razorpay/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      data = await res.json()
      if (!res.ok) {
        alert((data as any).error || 'Could not start checkout. Please try again.')
        setLoading('')
        return
      }
    } catch {
      alert('Network error. Check your connection and try again.')
      setLoading('')
      return
    }

    try {
      await openCheckout(data, {
        onSuccess: async (success) => {
          try { await verifyPayment(success) } catch (e) { console.warn('[checkout] verify:', e) }
          window.location.href = `/dashboard?upgraded=true&plan=${planKey}&provider=razorpay`
        },
        onDismiss: () => setLoading(''),
        onFailure: (err) => { alert('Payment failed: ' + err); setLoading('') },
      })
    } catch (e: any) {
      alert(e.message || 'Could not open payment. Please try again.')
      setLoading('')
    }
  }

  // ─── Lemon Squeezy checkout (International) ───────────────────────────────
  const startLSCheckout = async (planKey: string) => {
    setLoading(planKey)
    try {
      const res = await fetch('/api/lemonsqueezy/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Could not start checkout. Please try again.')
        setLoading('')
        return
      }
      // Redirect to Lemon Squeezy hosted checkout
      window.location.href = data.url
    } catch {
      alert('Network error. Check your connection and try again.')
      setLoading('')
    }
  }

  const startCheckout = async (planKey: string | null) => {
    if (!planKey) return
    if (!user) { router.push(`/login?redirect=/pricing&plan=${planKey}`); return }
    if (isIndia) {
      await startRazorpayCheckout(planKey)
    } else {
      await startLSCheckout(planKey)
    }
  }

  const dayPass = () => startCheckout('day_pass')

  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 32px', textAlign: 'center' }}>
        {userPlan?.hasActiveSubscription && (userPlan.plan === 'pro' || userPlan.plan === 'firm') && (
          <div style={{ maxWidth: 640, margin: '0 auto 28px', padding: '14px 18px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>You're on the {userPlan.plan === 'pro' ? 'Pro' : 'Firm'} plan</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>To switch plans or cancel, head to Billing.</div>
            </div>
            <Link href="/dashboard/billing" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              Open Billing →
            </Link>
          </div>
        )}
        <h1 style={{ fontSize: 'clamp(34px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 14 }}>
          Pay only for what you use.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.6 }}>
          Page-based pricing. No hidden fees.
        </p>

        {/* Payment method badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {geoLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>Detecting your region…</div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: 'var(--text-dim)' }}>
              {isIndia ? (
                <>🇮🇳 India — Pay via <strong>Razorpay</strong> (UPI, Card, NetBanking) · <button onClick={() => setIsIndia(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Switch to $ USD</button></>
              ) : (
                <>🌍 International — Pay via <strong>Lemon Squeezy</strong> (Card, PayPal, Apple/Google Pay) · <button onClick={() => setIsIndia(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Switch to ₹ INR</button></>
              )}
            </div>
          )}
        </div>

        {/* Billing cycle toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
          <button onClick={() => setCycle('monthly')} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer',
            background: cycle === 'monthly' ? 'var(--accent)' : 'transparent',
            color: cycle === 'monthly' ? 'var(--on-accent)' : 'var(--text-dim)',
            fontFamily: 'Sora,sans-serif',
          }}>Monthly</button>
          <button onClick={() => setCycle('annual')} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer',
            background: cycle === 'annual' ? 'var(--accent)' : 'transparent',
            color: cycle === 'annual' ? 'var(--on-accent)' : 'var(--text-dim)',
            fontFamily: 'Sora,sans-serif',
          }}>Annual <span className="mono" style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>−17%</span></button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {tiers.map(t => (
            <div key={t.key} style={{
              background: t.highlight ? 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))' : 'var(--surface)',
              border: `1.5px solid ${t.highlight ? 'var(--accent-border)' : 'var(--border)'}`,
              borderRadius: 16, padding: 28, position: 'relative', display: 'flex', flexDirection: 'column',
              boxShadow: t.highlight ? '0 12px 40px var(--accent-bg)' : 'var(--shadow-sm)',
            }}>
              {t.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 20, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{t.badge}</div>
              )}
              <div style={{ marginBottom: 18 }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 2 }}>{t.name.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>{t.desc}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  {t.price === '0' ? <span style={{ fontSize: 42, fontWeight: 600 }}>Free</span> : (
                    <>
                      <span style={{ fontSize: 16, color: 'var(--text-muted)', alignSelf: 'flex-start', marginTop: 12 }}>{t.symbol}</span>
                      <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.02em' }}>{t.price}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/{t.period}</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', marginTop: 6 }}>{t.pages}</div>
                {t.sub && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontFamily: 'DM Mono, monospace' }}>{t.sub}</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 24 }}>
                {t.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 3 }}><polyline points="20 6 9 17 4 12" /></svg>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{f}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const isFree = !t.planKey
                const currentPlan = userPlan?.plan
                const currentPlanKey = userPlan?.planKey
                const isCurrentPlan = !isFree && currentPlanKey === t.planKey
                const userHasSub = !!userPlan?.hasActiveSubscription && (currentPlan === 'pro' || currentPlan === 'firm')
                const showSwitch = !isFree && userHasSub && !isCurrentPlan

                if (isFree) {
                  if (currentPlan === 'free') {
                    return (
                      <div style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--accent-border)' }}>
                        ✓ Your current plan
                      </div>
                    )
                  }
                  return (
                    <Link href={t.href!} style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border-strong)' }}>
                      {t.cta}
                    </Link>
                  )
                }

                if (isCurrentPlan) {
                  return (
                    <Link href="/dashboard/billing" style={{ display: 'block', textAlign: 'center', padding: '14px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid var(--accent-border)' }}>
                      ✓ Your current plan · Manage →
                    </Link>
                  )
                }

                if (showSwitch) {
                  return (
                    <Link href={`/dashboard/billing?switch=${t.planKey}`} style={{ display: 'block', textAlign: 'center', padding: '14px', background: t.highlight ? 'var(--accent)' : 'var(--surface-2)', color: t.highlight ? 'var(--on-accent)' : 'var(--text)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: t.highlight ? 'none' : '1px solid var(--border-strong)' }}>
                      Switch in Billing →
                    </Link>
                  )
                }

                return (
                  <button onClick={() => startCheckout(t.planKey)} disabled={!!loading}
                    style={{
                      padding: '14px', background: t.highlight ? 'var(--accent)' : 'var(--surface-2)',
                      color: t.highlight ? 'var(--on-accent)' : 'var(--text)',
                      borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'Sora,sans-serif',
                      border: t.highlight ? 'none' : '1px solid var(--border-strong)',
                      cursor: loading ? 'wait' : 'pointer', opacity: loading && loading !== t.planKey ? 0.5 : 1,
                      width: '100%',
                    }}>
                    {loading === t.planKey
                      ? (isIndia ? 'Opening Razorpay...' : 'Opening checkout...')
                      : t.cta + ' →'}
                  </button>
                )
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Day Pass + Top-up */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 24px', display: 'grid', gap: 14 }}>
        {userPlan?.plan !== 'firm' && (
          <div style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface-2))', border: '1px solid var(--accent-border)', borderRadius: 16, padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>⚡</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Just need a one-off conversion?</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Day Pass:{' '}
                <strong style={{ color: 'var(--accent)' }}>
                  {isIndia ? '₹49' : '$0.99'}
                </strong>{' '}
                for 100 pages within 24 hours. No subscription.
              </div>
            </div>
            <button onClick={dayPass} disabled={!!loading}
              style={{ padding: '12px 24px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              {loading === 'day_pass' ? 'Opening...' : 'Buy Day Pass →'}
            </button>
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>📈</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Need extra pages mid-month?</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Top-up{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {isIndia ? '₹100' : '$1.20'}
              </strong>{' '}
              for{' '}
              <strong style={{ color: 'var(--accent)' }}>60 extra pages</strong>{' '}
              — added instantly to your current month. Available to all paid plans. Top-ups expire on the 1st of next month.
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, textAlign: 'center', marginBottom: 32, letterSpacing: '-0.02em' }}>Pricing FAQ</h2>
        {FAQ.map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
              {faq.q}
              <span style={{ color: openFaq === i ? 'var(--accent)' : 'var(--text-muted)', fontSize: 20, flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
            </button>
            {openFaq === i && <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, paddingBottom: 16, marginTop: -4 }}>{faq.a}</p>}
          </div>
        ))}
      </div>

      <Footer />
    </div>
  )
}
