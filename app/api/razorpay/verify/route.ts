import { NextRequest, NextResponse } from 'next/server'
import { razorpay, DAY_PASS_PAGES, TOPUP_PAGES } from '@/lib/razorpay'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Client-triggered payment verification — called from the Razorpay onSuccess handler.
 * Fetches the actual payment state from Razorpay and updates the DB.
 *
 * Why this exists: in dev (and any time webhooks aren't reachable), the
 * subscription.activated / payment.captured webhook events don't arrive,
 * so the DB never sees the user's new plan / day pass / top-up. This
 * endpoint replicates the same logic but is triggered from the browser
 * after Razorpay's success callback fires.
 *
 * It's safe to call alongside the webhook (idempotent on subscription side;
 * day pass + top-up use razorpay_payment_id uniqueness).
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  let { paymentId, subscriptionId, orderId } = body as {
    paymentId?: string
    subscriptionId?: string
    orderId?: string
  }

  const sb = createServiceSupabase()

  // ─── Auto-recover: scan Razorpay for this user's recent active sub ──
  if (!paymentId && !subscriptionId && !orderId) {
    try {
      const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
      const result: any = await razorpay.subscriptions.all({ from: since, count: 100 })
      // Find the most recent active sub belonging to this user
      const mine = result.items?.find((s: any) =>
        s.notes?.user_id === user.id &&
        (s.status === 'active' || s.status === 'authenticated')
      )
      if (mine) {
        subscriptionId = mine.id
        console.log(`[verify] auto-recovered subscription ${mine.id} for user ${user.id}`)
      } else {
        return NextResponse.json({
          error: 'No active subscription found for your account. If you just paid, wait a few seconds and try again.',
          searched: result.items?.length ?? 0,
        }, { status: 404 })
      }
    } catch (e: any) {
      console.error('[verify] auto-recover failed:', e?.error?.description || e?.message)
      return NextResponse.json({
        error: 'Could not search Razorpay for your subscription. Please contact support@bankxlai.com.',
      }, { status: 500 })
    }
  }

  // ─── Subscription verification ─────────────────────────────────────
  if (subscriptionId) {
    let sub: any
    try {
      sub = await razorpay.subscriptions.fetch(subscriptionId)
    } catch (e: any) {
      console.error('[verify] sub fetch failed:', e?.error?.description || e?.message)
      return NextResponse.json({ error: 'Subscription not found in Razorpay.' }, { status: 404 })
    }

    // Security: confirm it belongs to this user
    if (sub.notes?.user_id && sub.notes.user_id !== user.id) {
      return NextResponse.json({ error: 'Subscription does not belong to you.' }, { status: 403 })
    }

    const planTier = sub.notes?.plan as string | undefined
    const planKey = sub.notes?.plan_key as string | undefined

    if ((sub.status === 'active' || sub.status === 'authenticated') &&
        (planTier === 'pro' || planTier === 'firm')) {

      // If this subscription replaced an older one (plan switch), cancel
      // the old subscription NOW — only after the new one is paid for.
      const oldSubId = sub.notes?.old_subscription_id as string | undefined
      if (oldSubId && oldSubId !== sub.id) {
        try {
          await razorpay.subscriptions.cancel(oldSubId, false)  // false = cancel immediately
          console.log(`[verify] cancelled old subscription ${oldSubId} after successful switch`)
        } catch (e: any) {
          // If the old sub is already cancelled/completed, this fails — and that's fine
          const msg = e?.error?.description || e?.message || ''
          if (!/already|completed|cancel/i.test(msg)) {
            console.error('[verify] could not cancel old sub:', msg)
          }
        }
      }

      const update: Record<string, any> = {
        plan: planTier,
        plan_key: planKey || null,
        razorpay_subscription_id: sub.id,
        payment_failed_at: null,
        subscription_ends_at: null,
      }
      if (sub.customer_id) update.razorpay_customer_id = sub.customer_id
      await sb.from('profiles').update(update).eq('id', user.id)
      console.log(`[verify] activated ${planKey || planTier} for user ${user.id}`)
      return NextResponse.json({ ok: true, action: 'activated', plan: planTier, planKey })
    }

    return NextResponse.json({
      ok: false,
      action: 'not_yet_active',
      status: sub.status,
      message: 'Payment is processing. Plan will activate once Razorpay confirms.',
    }, { status: 202 })
  }

  // ─── Order verification (Day Pass or Top-up) ───────────────────────
  if (orderId || paymentId) {
    let payment: any
    try {
      // Prefer paymentId (more direct); fall back to fetching via order
      if (paymentId) {
        payment = await razorpay.payments.fetch(paymentId)
      } else {
        // Fetch all payments for this order — use the captured one
        const payments: any = await razorpay.orders.fetchPayments(orderId!)
        const captured = payments.items?.find((p: any) => p.status === 'captured')
        if (!captured) {
          return NextResponse.json({ error: 'No captured payment found for this order.' }, { status: 404 })
        }
        payment = captured
      }
    } catch (e: any) {
      console.error('[verify] payment fetch failed:', e?.error?.description || e?.message)
      return NextResponse.json({ error: 'Payment not found in Razorpay.' }, { status: 404 })
    }

    if (payment.status !== 'captured') {
      return NextResponse.json({
        ok: false,
        action: 'not_captured',
        status: payment.status,
      }, { status: 202 })
    }

    const notes = payment.notes || {}
    if (notes.user_id && notes.user_id !== user.id) {
      return NextResponse.json({ error: 'Payment does not belong to you.' }, { status: 403 })
    }

    // ─── Top-up: idempotency via razorpay_payment_id on day_passes ───
    if (notes.purpose === 'topup') {
      // Check if we've already processed this exact payment
      const { data: existing } = await sb.from('day_passes')
        .select('id')
        .eq('razorpay_payment_id', payment.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ ok: true, action: 'already_processed' })
      }

      const pages = parseInt(String(notes.pages ?? TOPUP_PAGES), 10) || TOPUP_PAGES

      // Insert a record row for idempotency (we use day_passes table as the audit log)
      const farFuture = new Date()
      farFuture.setMonth(farFuture.getMonth() + 1)
      farFuture.setDate(1)
      farFuture.setHours(0, 0, 0, 0)

      await sb.from('day_passes').insert({
        user_id: user.id,
        conversions_remaining: 0,           // not consumed via day pass; bonus_pages tracks remaining
        expires_at: farFuture.toISOString(), // book-keeping
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id || null,
      })

      // Increment bonus_pages on profile
      const { data: profile } = await sb.from('profiles').select('bonus_pages').eq('id', user.id).single()
      const current = profile?.bonus_pages ?? 0
      await sb.from('profiles').update({ bonus_pages: current + pages }).eq('id', user.id)

      console.log(`[verify] top-up: +${pages} pages for user ${user.id}`)
      return NextResponse.json({ ok: true, action: 'topup', pages_added: pages })
    }

    // ─── Day Pass ─────────────────────────────────────────────────────
    if (notes.plan_key === 'day_pass') {
      const { data: existing } = await sb.from('day_passes')
        .select('id')
        .eq('razorpay_payment_id', payment.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ ok: true, action: 'already_processed' })
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await sb.from('day_passes').insert({
        user_id: user.id,
        conversions_remaining: DAY_PASS_PAGES,
        expires_at: expiresAt.toISOString(),
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id || null,
      })
      console.log(`[verify] day pass granted to user ${user.id}`)
      return NextResponse.json({ ok: true, action: 'day_pass_granted' })
    }

    return NextResponse.json({
      ok: true,
      action: 'unknown',
      message: 'Payment verified but no matching action.',
    })
  }

  return NextResponse.json({
    error: 'Provide either subscriptionId, orderId, or paymentId.',
  }, { status: 400 })
}
