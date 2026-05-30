import {
  lemonSqueezySetup,
  createCheckout,
  cancelSubscription,
  getSubscription,
  listSubscriptions,
} from '@lemonsqueezy/lemonsqueezy.js'

export { createCheckout, cancelSubscription, getSubscription, listSubscriptions }

/** Call once at the start of every server action that uses the LS SDK. */
export function setupLS() {
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY || '' })
}

export type LSPlanKey = 'pro_monthly' | 'pro_annual' | 'firm_monthly' | 'firm_annual' | 'day_pass' | 'topup'

export interface LSPlanConfig {
  key: LSPlanKey
  /** Tier stored on profile.plan */
  plan: 'pro' | 'firm' | 'day_pass' | 'topup'
  name: string
  description: string
  amountUsd: number
  pages: number
  type: 'subscription' | 'one_time'
  /** Lemon Squeezy variant ID — set via env */
  variantId?: string
  cycle: 'month' | 'year' | 'one-time'
}

export const LS_DAY_PASS_PAGES = 100
export const LS_TOPUP_PAGES = 60

export const LS_PLANS: Record<LSPlanKey, LSPlanConfig> = {
  pro_monthly: {
    key: 'pro_monthly',
    plan: 'pro',
    name: 'Pro Monthly',
    description: '800 pages every month',
    amountUsd: 8,
    pages: 800,
    type: 'subscription',
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY,
    cycle: 'month',
  },
  pro_annual: {
    key: 'pro_annual',
    plan: 'pro',
    name: 'Pro Annual',
    description: '800 pages / month, billed yearly',
    amountUsd: 80,
    pages: 800,
    type: 'subscription',
    variantId: process.env.LEMONSQUEEZY_VARIANT_PRO_ANNUAL,
    cycle: 'year',
  },
  firm_monthly: {
    key: 'firm_monthly',
    plan: 'firm',
    name: 'Firm Monthly',
    description: '8,000 pages / month + team + bulk',
    amountUsd: 59,
    pages: 8000,
    type: 'subscription',
    variantId: process.env.LEMONSQUEEZY_VARIANT_FIRM_MONTHLY,
    cycle: 'month',
  },
  firm_annual: {
    key: 'firm_annual',
    plan: 'firm',
    name: 'Firm Annual',
    description: '8,000 pages / month, billed yearly',
    amountUsd: 590,
    pages: 8000,
    type: 'subscription',
    variantId: process.env.LEMONSQUEEZY_VARIANT_FIRM_ANNUAL,
    cycle: 'year',
  },
  day_pass: {
    key: 'day_pass',
    plan: 'day_pass',
    name: 'Day Pass',
    description: '100 pages within 24 hours',
    amountUsd: 0.99,
    pages: LS_DAY_PASS_PAGES,
    type: 'one_time',
    variantId: process.env.LEMONSQUEEZY_VARIANT_DAY_PASS,
    cycle: 'one-time',
  },
  topup: {
    key: 'topup',
    plan: 'topup',
    name: 'Page Top-up',
    description: '60 extra pages',
    amountUsd: 1.2,
    pages: LS_TOPUP_PAGES,
    type: 'one_time',
    variantId: process.env.LEMONSQUEEZY_VARIANT_TOPUP,
    cycle: 'one-time',
  },
}

/** Verify the HMAC-SHA256 signature Lemon Squeezy sends on every webhook. */
export async function verifyLSSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) return false
  const { createHmac } = await import('crypto')
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}
