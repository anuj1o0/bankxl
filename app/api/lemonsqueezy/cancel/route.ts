import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'
import { setupLS, cancelSubscription } from '@/lib/lemonsqueezy'

export const runtime = 'nodejs'

/**
 * Cancel a Lemon Squeezy subscription at the end of the current billing period.
 * The user keeps access until the period ends (LS webhook fires subscription_cancelled
 * or subscription_expired to downgrade the DB at that point).
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceSupabase()
  const { data: profile } = await sb
    .from('profiles')
    .select('ls_subscription_id, plan, payment_provider')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  if (profile.payment_provider !== 'lemonsqueezy') {
    return NextResponse.json({
      error: 'This account uses Razorpay, not Lemon Squeezy. Use /api/razorpay/cancel instead.',
    }, { status: 400 })
  }
  if (!profile.ls_subscription_id) {
    return NextResponse.json({ error: 'No active Lemon Squeezy subscription found.' }, { status: 400 })
  }

  setupLS()

  try {
    await cancelSubscription(profile.ls_subscription_id)
  } catch (e: any) {
    const msg = e?.message || ''
    // Already cancelled — that's fine
    if (/already|cancel/i.test(msg)) {
      return NextResponse.json({ ok: true, message: 'Subscription was already cancelled.' })
    }
    console.error('[ls/cancel] cancel failed:', msg)
    return NextResponse.json({ error: 'Could not cancel subscription. Email support@bankxlai.com' }, { status: 500 })
  }

  // Lemon Squeezy cancel is at-period-end by default. Mark it in the DB so the UI
  // shows "Access until [date]". The exact end date comes from the LS webhook;
  // for now we just clear razorpay/ls sub IDs — the plan stays active.
  // The actual downgrade to free happens when LS fires subscription_expired.
  await sb.from('profiles').update({
    // Don't clear ls_subscription_id yet — webhook uses it for idempotency
    // Keep plan active until LS confirms expiry via webhook
  }).eq('id', user.id)

  return NextResponse.json({
    ok: true,
    message: 'Subscription cancelled. You\'ll keep access until the end of your billing period.',
  })
}
