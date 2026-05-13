import Razorpay from 'razorpay'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy',
})

export type PlanKey = 'day_pass' | 'pro_monthly' | 'pro_annual' | 'firm_monthly' | 'firm_annual'

export interface PlanConfig {
  key: PlanKey
  /** Plan tier persisted on profile.plan column */
  plan: 'pro' | 'firm' | 'day_pass'
  name: string
  description: string
  /** Amount in paise (₹1 = 100 paise) */
  amount: number
  /** Display amount in INR (whole rupees) */
  amountInr: number
  /** Approx USD equivalent for international display */
  amountUsd: number
  /** Pages included */
  pages: number
  /** subscription = recurring; one_time = single charge */
  type: 'subscription' | 'one_time'
  /** Razorpay plan ID — required for subscriptions, ignored for one-time */
  planId?: string
  /** Display label */
  cycle: 'month' | 'year' | 'one-time'
  /** Number of billing cycles before subscription ends naturally */
  totalCount?: number
  features: string[]
}

export const DAY_PASS_PAGES = 100
export const TOPUP_PAGES = 60
export const TOPUP_AMOUNT_PAISE = 10000   // ₹100
export const TOPUP_AMOUNT_INR = 100
export const TOPUP_AMOUNT_USD = 1

export const PLANS: Record<PlanKey, PlanConfig> = {
  day_pass: {
    key: 'day_pass',
    plan: 'day_pass',
    name: 'Day Pass',
    description: '100 pages within 24 hours',
    amount: 4900,
    amountInr: 49,
    amountUsd: 1,
    pages: DAY_PASS_PAGES,
    type: 'one_time',
    cycle: 'one-time',
    features: ['100 pages within 24 hours', 'Excel + CSV download', 'No subscription'],
  },
  pro_monthly: {
    key: 'pro_monthly',
    plan: 'pro',
    name: 'Pro Monthly',
    description: '800 pages every month',
    amount: 49900,                // ₹499
    amountInr: 499,
    amountUsd: 8,
    pages: 800,
    type: 'subscription',
    planId: process.env.RAZORPAY_PLAN_PRO_MONTHLY,
    cycle: 'month',
    totalCount: 12,
    features: ['800 pages / month', 'All formats (Excel/CSV/JSON/Tally)', 'All Indian & global banks', 'Priority processing', 'Email support'],
  },
  pro_annual: {
    key: 'pro_annual',
    plan: 'pro',
    name: 'Pro Annual',
    description: '800 pages / month, billed yearly',
    amount: 499900,               // ₹4,999 (≈10× monthly = 2 months free)
    amountInr: 4999,
    amountUsd: 80,
    pages: 800,
    type: 'subscription',
    planId: process.env.RAZORPAY_PLAN_PRO_ANNUAL,
    cycle: 'year',
    totalCount: 5,
    features: ['Everything in Pro', '2 months free', 'Lock in current pricing'],
  },
  firm_monthly: {
    key: 'firm_monthly',
    plan: 'firm',
    name: 'Firm Monthly',
    description: '8,000 pages / month + team + bulk',
    amount: 499900,               // ₹4,999
    amountInr: 4999,
    amountUsd: 50,
    pages: 8000,
    type: 'subscription',
    planId: process.env.RAZORPAY_PLAN_FIRM_MONTHLY,
    cycle: 'month',
    totalCount: 12,
    features: ['8,000 pages / month', '5 team seats', 'Bulk ZIP upload (50 files)', 'White-label Excel', 'Dedicated support'],
  },
  firm_annual: {
    key: 'firm_annual',
    plan: 'firm',
    name: 'Firm Annual',
    description: '8,000 pages / month, billed yearly',
    amount: 4999900,              // ₹49,999
    amountInr: 49999,
    amountUsd: 500,
    pages: 8000,
    type: 'subscription',
    planId: process.env.RAZORPAY_PLAN_FIRM_ANNUAL,
    cycle: 'year',
    totalCount: 5,
    features: ['Everything in Firm', '2 months free', 'Annual invoicing'],
  },
}

export const PUBLIC_KEY = process.env.RAZORPAY_KEY_ID || ''
