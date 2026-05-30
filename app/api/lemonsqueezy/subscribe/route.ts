import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { setupLS, LS_PLANS, LSPlanKey, createCheckout } from '@/lib/lemonsqueezy'

export const runtime = 'nodejs'

/**
 * Create a Lemon Squeezy hosted checkout session.
 * Returns { url } — the client redirects the browser to this URL.
 * After payment LS redirects back to /dashboard?upgraded=true&plan=...
 * and fires a webhook to update the DB.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const planKey = body.plan as LSPlanKey

  if (!planKey || !LS_PLANS[planKey]) {
    return NextResponse.json({ error: 'Invalid plan key.' }, { status: 400 })
  }

  const plan = LS_PLANS[planKey]
  if (!plan.variantId) {
    return NextResponse.json({
      error: `Lemon Squeezy variant ID for "${planKey}" is not configured. Set LEMONSQUEEZY_VARIANT_${planKey.toUpperCase()} in your environment.`,
    }, { status: 500 })
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  if (!storeId) {
    return NextResponse.json({ error: 'Lemon Squeezy store ID not configured.' }, { status: 500 })
  }

  setupLS()

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

  const { data, error } = await createCheckout(storeId, plan.variantId, {
    checkoutData: {
      email: user.email || '',
      custom: {
        user_id: user.id,
        plan_key: planKey,
        plan: plan.plan,
        // For one-time purchases, include pages count
        ...(plan.type === 'one_time' ? { pages: plan.pages } : {}),
        // Distinguish day_pass from topup
        ...(plan.key === 'topup' ? { purpose: 'topup' } : {}),
      },
    },
    checkoutOptions: {
      embed: false,
      media: false,
      logo: true,
    },
    productOptions: {
      name: 'BankXL ' + plan.name,
      description: plan.description,
      redirectUrl: `${appUrl}/dashboard?upgraded=true&plan=${planKey}&provider=lemonsqueezy`,
      receiptButtonText: 'Go to Dashboard',
      receiptThankYouNote:
        'Thank you for choosing BankXL! Your plan will be activated within a few seconds. If it takes longer, click "Sync" on the dashboard.',
      enabledVariants: [parseInt(plan.variantId, 10)],
    },
  })

  if (error || !data?.data?.attributes?.url) {
    console.error('[ls/subscribe] checkout create failed:', error)
    return NextResponse.json({
      error: (error as any)?.message || 'Could not create checkout session. Please try again.',
    }, { status: 500 })
  }

  return NextResponse.json({ url: data.data.attributes.url })
}
