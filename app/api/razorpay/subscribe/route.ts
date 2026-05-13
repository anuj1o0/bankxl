import { NextRequest, NextResponse } from 'next/server'
import { razorpay, PLANS, PlanKey, PUBLIC_KEY } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to subscribe.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const planKey = body.plan as PlanKey
  if (!planKey || !PLANS[planKey]) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }
  if (!PUBLIC_KEY) {
    return NextResponse.json({ error: 'Razorpay is not configured. Add RAZORPAY_KEY_ID to .env.local.' }, { status: 500 })
  }

  const plan = PLANS[planKey]
  const sb = createServiceSupabase()

  // ─── Plan eligibility check (prevents double-subscriptions) ──────
  const { data: profile } = await sb
    .from('profiles')
    .select('plan, razorpay_subscription_id')
    .eq('id', user.id)
    .single()

  if (plan.type === 'one_time') {
    // Day Pass — Firm users have unlimited, doesn't make sense
    if (profile?.plan === 'firm') {
      return NextResponse.json({
        error: 'Your Firm plan already includes unlimited pages — Day Pass not needed.',
      }, { status: 400 })
    }
  } else {
    // Subscription — refuse if user already has an active one
    if (profile?.razorpay_subscription_id) {
      return NextResponse.json({
        error: profile.plan === plan.plan
          ? `You're already subscribed to ${plan.plan === 'pro' ? 'Pro' : 'Firm'}. Manage your plan from the Billing page.`
          : `You have an active ${profile.plan} subscription. To ${plan.plan === 'firm' ? 'upgrade' : 'switch'}, use the Switch Plan option in Billing.`,
        currentPlan: profile.plan,
        redirectTo: '/dashboard/billing',
      }, { status: 409 })
    }
  }

  // ─── One-time order (Day Pass) ────────────────────────────────────
  if (plan.type === 'one_time') {
    try {
      const order = await razorpay.orders.create({
        amount: plan.amount,
        currency: 'INR',
        notes: {
          user_id: user.id,
          plan: plan.plan,
          plan_key: planKey,
          email: user.email || '',
        },
      })
      return NextResponse.json({
        type: 'order',
        orderId: order.id,
        amount: plan.amount,
        keyId: PUBLIC_KEY,
        name: 'BankXL ' + plan.name,
        description: plan.description,
        prefillEmail: user.email || '',
      })
    } catch (e: any) {
      console.error('[razorpay] order create failed:', e?.error?.description || e?.message)
      return NextResponse.json({ error: e?.error?.description || 'Could not create order.' }, { status: 500 })
    }
  }

  // ─── Subscription (Pro / Firm) ────────────────────────────────────
  if (!plan.planId) {
    return NextResponse.json({
      error: `Plan ID for "${planKey}" is not configured. Add RAZORPAY_PLAN_${planKey.toUpperCase()} to .env.local.`,
    }, { status: 500 })
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,
      total_count: plan.totalCount || 12,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        plan: plan.plan,
        plan_key: planKey,
        email: user.email || '',
      },
    })

    // We do NOT pre-populate razorpay_subscription_id on the profile.
    // The subscription is created in Razorpay but isn't active until the user
    // pays the first installment. Webhook (subscription.activated) is the
    // source of truth for "this user has an active subscription".
    // If the user dismisses the Razorpay modal, the sub stays in 'created'
    // state in Razorpay and auto-expires — nothing to clean up locally.

    return NextResponse.json({
      type: 'subscription',
      subscriptionId: subscription.id,
      keyId: PUBLIC_KEY,
      name: 'BankXL ' + plan.name,
      description: plan.description,
      prefillEmail: user.email || '',
    })
  } catch (e: any) {
    console.error('[razorpay] subscription create failed:', e?.error?.description || e?.message)
    return NextResponse.json({ error: e?.error?.description || 'Could not create subscription.' }, { status: 500 })
  }
}
