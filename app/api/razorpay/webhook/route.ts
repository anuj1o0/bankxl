import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceSupabase } from '@/lib/supabase-server'
import { DAY_PASS_PAGES, TOPUP_PAGES } from '@/lib/razorpay'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    console.error('[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected !== signature) {
    console.error('[razorpay/webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sb = createServiceSupabase()
  const eventName = event.event as string
  console.log(`[razorpay/webhook] ${eventName}`)

  try {
    switch (eventName) {
      // ─── Subscription activated / first charge ──────────────────────
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const userId = sub.notes?.user_id
        const planTier = sub.notes?.plan as string | undefined
        const planKey = sub.notes?.plan_key as string | undefined
        const oldSubId = sub.notes?.old_subscription_id as string | undefined

        if (userId && (planTier === 'pro' || planTier === 'firm')) {
          // If this is a plan switch, cancel the old sub now (only after new one paid)
          if (oldSubId && oldSubId !== sub.id) {
            try {
              const { razorpay } = await import('@/lib/razorpay')
              await razorpay.subscriptions.cancel(oldSubId, false)
              console.log(`[razorpay/webhook] cancelled old subscription ${oldSubId} after switch`)
            } catch (e: any) {
              const msg = e?.error?.description || e?.message || ''
              if (!/already|completed|cancel/i.test(msg)) {
                console.error('[razorpay/webhook] could not cancel old sub:', msg)
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
          await sb.from('profiles').update(update).eq('id', userId)
          console.log(`[razorpay/webhook] activated ${planKey || planTier} for user ${userId}`)
        }
        break
      }

      // ─── Subscription cancelled (could be at-cycle-end OR immediate) ─
      case 'subscription.cancelled': {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const userId = sub.notes?.user_id
        if (!userId) break

        // If end_at is in the future, the cancellation is scheduled — keep plan active
        const endAtMs = sub.end_at ? sub.end_at * 1000 : null
        const now = Date.now()

        if (endAtMs && endAtMs > now) {
          // Cancel-at-cycle-end: user keeps access until end_at
          await sb.from('profiles').update({
            subscription_ends_at: new Date(endAtMs).toISOString(),
          }).eq('id', userId)
          console.log(`[razorpay/webhook] scheduled cancellation for user ${userId}, ends ${new Date(endAtMs).toISOString()}`)
        } else {
          // Immediate cancellation
          await sb.from('profiles').update({
            plan: 'free',
            plan_key: null,
            razorpay_subscription_id: null,
            subscription_ends_at: new Date().toISOString(),
          }).eq('id', userId)
          console.log(`[razorpay/webhook] immediate cancellation for user ${userId}`)
        }
        break
      }

      // ─── Subscription actually ended (cycle finished or halted) ─────
      case 'subscription.completed':
      case 'subscription.halted':
      case 'subscription.expired': {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const userId = sub.notes?.user_id
        if (userId) {
          await sb.from('profiles').update({
            plan: 'free',
            plan_key: null,
            razorpay_subscription_id: null,
            subscription_ends_at: new Date().toISOString(),
          }).eq('id', userId)
          console.log(`[razorpay/webhook] subscription ended for user ${userId} (${eventName})`)
        }
        break
      }

      case 'subscription.pending':
      case 'subscription.paused': {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const userId = sub.notes?.user_id
        if (userId && sub.end_at) {
          await sb.from('profiles').update({
            subscription_ends_at: new Date(sub.end_at * 1000).toISOString(),
          }).eq('id', userId)
        }
        break
      }

      // ─── One-time payment captured (Day Pass or Top-up) ─────────────
      case 'payment.captured': {
        const payment = event.payload.payment?.entity
        if (!payment) break
        const notes = payment.notes || {}
        const userId = notes.user_id as string | undefined
        const planKey = notes.plan_key as string | undefined
        const purpose = notes.purpose as string | undefined  // 'topup' for top-ups

        if (!userId) break

        // ─── Top-up: add bonus pages to profile ───
        if (purpose === 'topup') {
          const pages = parseInt(String(notes.pages ?? TOPUP_PAGES), 10) || TOPUP_PAGES
          const { data: profile } = await sb.from('profiles').select('bonus_pages').eq('id', userId).single()
          const current = profile?.bonus_pages ?? 0
          await sb.from('profiles').update({
            bonus_pages: current + pages,
          }).eq('id', userId)
          console.log(`[razorpay/webhook] top-up: +${pages} pages for user ${userId} (now ${current + pages})`)
          break
        }

        // ─── Day Pass: insert pass row ───
        if (planKey === 'day_pass') {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
          await sb.from('day_passes').insert({
            user_id: userId,
            conversions_remaining: DAY_PASS_PAGES,
            expires_at: expiresAt.toISOString(),
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id || null,
          })
          console.log(`[razorpay/webhook] day pass granted to user ${userId}`)
        }
        break
      }

      case 'payment.failed':
      case 'subscription.payment_failed': {
        const payment = event.payload.payment?.entity
        const sub = event.payload.subscription?.entity
        const userId = payment?.notes?.user_id || sub?.notes?.user_id
        if (userId) {
          await sb.from('profiles').update({
            payment_failed_at: new Date().toISOString(),
          }).eq('id', userId)
        }
        break
      }
    }
  } catch (e: any) {
    console.error('[razorpay/webhook] handler error:', e?.message)
  }

  return NextResponse.json({ received: true })
}
