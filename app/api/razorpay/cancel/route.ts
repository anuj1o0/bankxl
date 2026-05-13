import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const cancelImmediately = body.immediate === true

  const sb = createServiceSupabase()
  const { data: profile } = await sb
    .from('profiles')
    .select('razorpay_subscription_id, plan')
    .eq('id', user.id)
    .single()

  if (!profile?.razorpay_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 })
  }

  try {
    // cancel_at_cycle_end: true = stay active until end of paid period, then cancel
    // false = cancel immediately
    await razorpay.subscriptions.cancel(profile.razorpay_subscription_id, !cancelImmediately)

    if (cancelImmediately) {
      // Webhook will also fire — but update locally for instant feedback
      await sb.from('profiles').update({
        plan: 'free',
        plan_key: null,
        razorpay_subscription_id: null,
        subscription_ends_at: new Date().toISOString(),
      }).eq('id', user.id)
    }

    return NextResponse.json({
      ok: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately.'
        : 'Subscription will end at the end of your current billing period. You keep access until then.',
    })
  } catch (e: any) {
    console.error('[razorpay/cancel] failed:', e?.error?.description || e?.message)
    return NextResponse.json({
      error: e?.error?.description || 'Could not cancel subscription. Please email support@bankxl.in.',
    }, { status: 500 })
  }
}
