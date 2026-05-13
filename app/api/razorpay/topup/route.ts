import { NextRequest, NextResponse } from 'next/server'
import { razorpay, PUBLIC_KEY, TOPUP_PAGES, TOPUP_AMOUNT_PAISE } from '@/lib/razorpay'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Buy 60 extra pages for ₹100. Pages are added to profile.bonus_pages
 * when payment.captured webhook fires. Bonus pages reset on the monthly cycle.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to buy pages.' }, { status: 401 })

  if (!PUBLIC_KEY) {
    return NextResponse.json({ error: 'Razorpay is not configured.' }, { status: 500 })
  }

  try {
    const order = await razorpay.orders.create({
      amount: TOPUP_AMOUNT_PAISE,
      currency: 'INR',
      notes: {
        user_id: user.id,
        purpose: 'topup',
        pages: TOPUP_PAGES,
        email: user.email || '',
      },
    })

    return NextResponse.json({
      type: 'order',
      orderId: order.id,
      amount: TOPUP_AMOUNT_PAISE,
      keyId: PUBLIC_KEY,
      name: `BankXL · ${TOPUP_PAGES} extra pages`,
      description: `Adds ${TOPUP_PAGES} pages to your current month's allowance`,
      prefillEmail: user.email || '',
    })
  } catch (e: any) {
    console.error('[razorpay/topup] order create failed:', e?.error?.description || e?.message)
    return NextResponse.json({ error: e?.error?.description || 'Could not create top-up order.' }, { status: 500 })
  }
}
