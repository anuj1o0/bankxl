import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Reconcile the user's profile with Razorpay's actual subscription state.
 * Useful when the local DB drifts (webhook missed, manual cancellation in Razorpay,
 * dismissed payment leaving stale sub_id, etc.).
 *
 * Logic:
 *   1. If profile has razorpay_subscription_id, fetch from Razorpay.
 *   2. If Razorpay status is 'active' or 'authenticated' → profile should reflect plan.
 *   3. If Razorpay status is 'cancelled', 'completed', 'expired', 'halted' → clear profile.
 *   4. If sub doesn't exist in Razorpay (404) → clear profile.
 */
export async function POST(_req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceSupabase()
  const { data: profile } = await sb
    .from('profiles')
    .select('id, plan, plan_key, razorpay_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // No subscription on file — nothing to reconcile
  if (!profile.razorpay_subscription_id) {
    return NextResponse.json({ ok: true, action: 'noop', message: 'No subscription on file.' })
  }

  let sub: any
  try {
    sub = await razorpay.subscriptions.fetch(profile.razorpay_subscription_id)
  } catch (e: any) {
    // Sub doesn't exist in Razorpay — clean up local state
    console.warn('[razorpay/sync] sub not found in Razorpay:', profile.razorpay_subscription_id)
    await sb.from('profiles').update({
      plan: 'free',
      plan_key: null,
      razorpay_subscription_id: null,
      subscription_ends_at: new Date().toISOString(),
    }).eq('id', user.id)
    return NextResponse.json({ ok: true, action: 'cleared', message: 'Cleared stale subscription reference.' })
  }

  const status = sub.status as string
  const planTier = sub.notes?.plan as string | undefined
  const planKey = sub.notes?.plan_key as string | undefined

  // Active states — make sure profile reflects this
  if (status === 'active' || status === 'authenticated') {
    if (planTier === 'pro' || planTier === 'firm') {
      const update: Record<string, any> = {
        plan: planTier,
        plan_key: planKey || null,
        razorpay_subscription_id: sub.id,
      }
      if (sub.customer_id) update.razorpay_customer_id = sub.customer_id
      await sb.from('profiles').update(update).eq('id', user.id)
      return NextResponse.json({ ok: true, action: 'restored', plan: planTier, message: 'Subscription is active in Razorpay — profile restored.' })
    }
  }

  // Created but not yet activated (user dismissed payment) — clear local state
  if (status === 'created' || status === 'pending') {
    await sb.from('profiles').update({
      plan: 'free',
      plan_key: null,
      razorpay_subscription_id: null,
      subscription_ends_at: null,
    }).eq('id', user.id)
    return NextResponse.json({ ok: true, action: 'cleared', message: 'Subscription was never activated — cleaned up.' })
  }

  // Cancelled but still within billing cycle — keep plan active until end
  if (status === 'cancelled') {
    const endAtMs = sub.end_at ? sub.end_at * 1000 : Date.now()
    if (endAtMs > Date.now()) {
      await sb.from('profiles').update({
        subscription_ends_at: new Date(endAtMs).toISOString(),
      }).eq('id', user.id)
      return NextResponse.json({ ok: true, action: 'scheduled', message: `Subscription ends ${new Date(endAtMs).toLocaleDateString('en-IN')}.` })
    }
    // Already past end — clear
    await sb.from('profiles').update({
      plan: 'free',
      plan_key: null,
      razorpay_subscription_id: null,
      subscription_ends_at: new Date(endAtMs).toISOString(),
    }).eq('id', user.id)
    return NextResponse.json({ ok: true, action: 'cleared', message: 'Subscription has ended.' })
  }

  // Terminal states — clear
  if (status === 'completed' || status === 'expired' || status === 'halted') {
    await sb.from('profiles').update({
      plan: 'free',
      plan_key: null,
      razorpay_subscription_id: null,
      subscription_ends_at: new Date().toISOString(),
    }).eq('id', user.id)
    return NextResponse.json({ ok: true, action: 'cleared', message: `Subscription ${status} — cleaned up.` })
  }

  return NextResponse.json({ ok: true, action: 'unknown', status, message: `Razorpay sub is in '${status}' state — no action taken.` })
}
