import { NextRequest, NextResponse } from 'next/server'
import { razorpay, PLANS, PlanKey, PUBLIC_KEY } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Switch to a different subscription plan SAFELY.
 *
 * IMPORTANT: This endpoint does NOT cancel the user's current subscription.
 * Instead, it creates a NEW subscription with the old subscription ID stored
 * in `notes.old_subscription_id`. The old subscription is cancelled ONLY
 * after the new one is paid for and activated (handled by the verify endpoint
 * and webhook).
 *
 * Why: if we cancelled the old sub upfront and the user dismissed the
 * payment modal, they'd be left with no plan. Now if they dismiss, nothing
 * changes — they keep their current plan.
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
    .select('id, plan, plan_key, razorpay_subscription_id')
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
  if (profile.plan_key === planKey) {
    return NextResponse.json({
      error: `You're already subscribed to ${target.name}.`,
    }, { status: 400 })
  }

  // Create new subscription — DON'T cancel the old one yet.
  // The old subscription will only be cancelled after the new payment succeeds
  // (in the verify endpoint and webhook handler).
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
        switched_from: profile.plan_key || profile.plan,
        old_subscription_id: profile.razorpay_subscription_id,  // ← cancelled only after new sub activates
      },
    })
  } catch (e: any) {
    console.error('[switch] new subscription create failed:', e?.error?.description || e?.message)
    return NextResponse.json({
      error: e?.error?.description || 'Could not create new subscription. Your current plan is unchanged.',
    }, { status: 500 })
  }

  // DO NOT update the profile here. The user's current plan stays as-is.
  // Only after the new sub is paid for and activated will:
  //   1. The old sub be cancelled
  //   2. The profile be updated to the new plan
  // (Both handled by the verify endpoint and webhook.)

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
