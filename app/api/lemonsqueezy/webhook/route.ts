import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'
import { verifyLSSignature, LS_DAY_PASS_PAGES, LS_TOPUP_PAGES } from '@/lib/lemonsqueezy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') || ''

  const valid = await verifyLSSignature(body, signature)
  if (!valid) {
    console.error('[ls/webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName = event.meta?.event_name as string
  const custom = event.meta?.custom_data || {}
  const userId = custom.user_id as string | undefined
  const planKey = custom.plan_key as string | undefined
  const planTier = custom.plan as string | undefined
  const purpose = custom.purpose as string | undefined

  console.log(`[ls/webhook] ${eventName} user=${userId || 'unknown'}`)

  const sb = createServiceSupabase()

  try {
    switch (eventName) {
      // ─── Subscription created / updated / resumed ──────────────────────
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        const sub = event.data?.attributes
        if (!sub || !userId) break

        const status: string = sub.status
        if (status === 'active' || status === 'trialing') {
          const lsSubId = String(event.data?.id || '')
          const lsCustomerId = String(sub.customer_id || '')

          const update: Record<string, any> = {
            plan: planTier || 'pro',
            plan_key: planKey || null,
            payment_provider: 'lemonsqueezy',
            ls_subscription_id: lsSubId,
            ls_customer_id: lsCustomerId || null,
            payment_failed_at: null,
            subscription_ends_at: null,
          }
          await sb.from('profiles').update(update).eq('id', userId)
          console.log(`[ls/webhook] activated ${planKey} for user ${userId}`)
        }

        // Cancelled-at-end-of-period: sub.ends_at is set, status may still be active
        if (status === 'cancelled' && sub.ends_at) {
          const endsAt = new Date(sub.ends_at)
          if (endsAt > new Date()) {
            await sb.from('profiles').update({
              subscription_ends_at: endsAt.toISOString(),
            }).eq('id', userId)
            console.log(`[ls/webhook] scheduled cancellation for user ${userId}, ends ${endsAt.toISOString()}`)
          }
        }
        break
      }

      // ─── Subscription cancelled ────────────────────────────────────────
      case 'subscription_cancelled': {
        const sub = event.data?.attributes
        if (!sub || !userId) break

        const endsAt = sub.ends_at ? new Date(sub.ends_at) : null
        if (endsAt && endsAt > new Date()) {
          // Cancel at end of period — keep plan active till then
          await sb.from('profiles').update({
            subscription_ends_at: endsAt.toISOString(),
          }).eq('id', userId)
          console.log(`[ls/webhook] cancel-at-period-end for user ${userId}, ends ${endsAt.toISOString()}`)
        } else {
          // Immediate cancellation
          await sb.from('profiles').update({
            plan: 'free',
            plan_key: null,
            payment_provider: null,
            ls_subscription_id: null,
            subscription_ends_at: new Date().toISOString(),
          }).eq('id', userId)
          console.log(`[ls/webhook] immediate cancel for user ${userId}`)
        }
        break
      }

      // ─── Subscription ended / expired / paused ──────────────────────────
      case 'subscription_expired':
      case 'subscription_paused': {
        if (!userId) break
        await sb.from('profiles').update({
          plan: 'free',
          plan_key: null,
          payment_provider: null,
          ls_subscription_id: null,
          subscription_ends_at: new Date().toISOString(),
        }).eq('id', userId)
        console.log(`[ls/webhook] subscription ended for user ${userId} (${eventName})`)
        break
      }

      // ─── Payment failed ────────────────────────────────────────────────
      case 'subscription_payment_failed': {
        if (userId) {
          await sb.from('profiles').update({
            payment_failed_at: new Date().toISOString(),
          }).eq('id', userId)
        }
        break
      }

      // ─── One-time order (Day Pass or Top-up) ──────────────────────────
      case 'order_created': {
        const order = event.data?.attributes
        if (!order || !userId) break
        if (order.status !== 'paid') break

        const orderId = String(event.data?.id || '')
        const pages = parseInt(String(custom.pages || '0'), 10)

        // ─── Top-up ───────────────────────────────────────────────────
        if (purpose === 'topup') {
          // Idempotency: check if we've already processed this order
          const { data: existing } = await sb.from('day_passes')
            .select('id').eq('ls_order_id', orderId).maybeSingle()
          if (existing) break

          const topupPages = pages || LS_TOPUP_PAGES

          // Insert audit record
          const farFuture = new Date()
          farFuture.setMonth(farFuture.getMonth() + 1)
          farFuture.setDate(1)
          farFuture.setHours(0, 0, 0, 0)

          await sb.from('day_passes').insert({
            user_id: userId,
            conversions_remaining: 0,
            expires_at: farFuture.toISOString(),
            ls_order_id: orderId,
          })

          const { data: profile } = await sb.from('profiles').select('bonus_pages').eq('id', userId).single()
          const current = profile?.bonus_pages ?? 0
          await sb.from('profiles').update({ bonus_pages: current + topupPages }).eq('id', userId)
          console.log(`[ls/webhook] top-up: +${topupPages} pages for user ${userId}`)
          break
        }

        // ─── Day Pass ─────────────────────────────────────────────────
        if (planKey === 'day_pass') {
          const { data: existing } = await sb.from('day_passes')
            .select('id').eq('ls_order_id', orderId).maybeSingle()
          if (existing) break

          const dayPassPages = pages || LS_DAY_PASS_PAGES
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
          await sb.from('day_passes').insert({
            user_id: userId,
            conversions_remaining: dayPassPages,
            expires_at: expiresAt.toISOString(),
            ls_order_id: orderId,
          })
          console.log(`[ls/webhook] day pass granted to user ${userId}`)
        }
        break
      }
    }
  } catch (e: any) {
    console.error('[ls/webhook] handler error:', e?.message)
  }

  return NextResponse.json({ received: true })
}
