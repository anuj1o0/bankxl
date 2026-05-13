import { NextRequest, NextResponse } from 'next/server'
import { razorpay, PLANS, PlanKey, PUBLIC_KEY } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Switch from one subscription plan to another.
 * Cancels the current subscription immediately and creates a new one.
 * The user pays for the new subscription via the returned checkout details.
 *
 * NOTE: User loses any remaining days on their current cycle (no proration).
 * The frontend should make this clear before calling.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const planKey = body.plan as PlanKey
  if (!planKey || !PLANS[planKey] || PLANS[planKey].type !== 'subscription') {
    return NextResponse.json({ error: 'Invalid plan. Switch only works for Pro/Firm subscriptions.' }, { status: 400 })
  }

  const target = PLANS[planKey]
  if (!target.planId) {
    return NextResponse.json({
      error: `Plan ID for "${planKey}" is not configured.`,
    }, { status: 500 })
  }

  const sb = createServiceSupabase()
  const { data: profile } = await sb
    .from('profiles')
    .select('id, plan, razorpay_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }
  if (!profile.razorpay_subscription_id) {
    return NextResponse.json({
      error: 'No active subscription to switch from. Use the regular Subscribe flow instead.',
      redirectTo: '/pricing',
    }, { status: 400 })
  }

  // ─── Cancel current subscription immediately ─────────────────────
  try {
    await razorpay.subscriptions.cancel(profile.razorpay_subscription_id, false)
  } catch (e: any) {
    const msg = e?.error?.description || e?.message || ''
    // If already cancelled in Razorpay (e.g. webhook delay), continue gracefully
    if (!/already|completed|cancel/i.test(msg)) {
      console.error('[switch] cancel failed:', msg)
      return NextResponse.json({
        error: 'Could not cancel current subscription. Please try again or email support.',
      }, { status: 500 })
    }
  }

  // Reset profile so they're temporarily on free until the new sub activates.
  // The webhook will fully activate the new plan when payment succeeds.
  await sb.from('profiles').update({
    razorpay_subscription_id: null,
    plan: 'free',
    plan_key: null,
    subscription_ends_at: new Date().toISOString(),
  }).eq('id', user.id)

  // ─── Create new subscription ──────────────────────────────────────
  let subscription
  try {
    subscription = await razorpay.subscriptions.create({
      plan_id: target.planId,
      total_count: target.totalCount || 12,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        plan: target.plan,
        plan_key: planKey,
        email: user.email || '',
        switched_from: profile.plan,
      },
    })
  } catch (e: any) {
    console.error('[switch] new subscription create failed:', e?.error?.description || e?.message)
    return NextResponse.json({
      error: 'Old subscription cancelled, but could not create new one. Please re-subscribe from the Pricing page.',
      redirectTo: '/pricing',
    }, { status: 500 })
  }

  // We do NOT pre-populate razorpay_subscription_id. The webhook
  // (subscription.activated) is the source of truth — until the user
  // actually pays, they're correctly on free plan.

  return NextResponse.json({
    type: 'subscription',
    subscriptionId: subscription.id,
    keyId: PUBLIC_KEY,
    name: 'BankXL ' + target.name,
    description: target.description,
    prefillEmail: user.email || '',
    switched_from: profile.plan,
  })
}
