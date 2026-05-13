import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export type Plan = 'free' | 'pro' | 'firm'
export type PlanKey = 'pro_monthly' | 'pro_annual' | 'firm_monthly' | 'firm_annual'
export type ExportFormat = 'excel' | 'csv' | 'json' | 'tally'

// Page-based plan limits (each PDF page = 1 unit consumed against the monthly quota).
// Bonus pages from top-ups are added on top via profile.bonus_pages.
export const PLAN_LIMITS: Record<Plan, number> = {
  free: 50,        // 50 pages / month — ~5–10 typical statements
  pro: 800,        // 800 pages / month — heavy individual use
  firm: 8000,      // 8,000 pages / month — for CA firms
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  firm: 'Firm',
}

export const PLAN_PAGE_LABEL: Record<Plan, string> = {
  free: '50 pages / month',
  pro: '800 pages / month',
  firm: '8,000 pages / month',
}

export const PLAN_FORMATS: Record<Plan, ExportFormat[]> = {
  free: ['excel'],
  pro: ['excel', 'csv', 'json', 'tally'],
  firm: ['excel', 'csv', 'json', 'tally'],
}

export function isFormatAllowed(plan: string, format: ExportFormat): boolean {
  const p = plan as Plan
  return (PLAN_FORMATS[p] ?? PLAN_FORMATS.free).includes(format)
}

export function pagesRemaining(plan: string, used: number, bonusPages: number = 0): number {
  const p = plan as Plan
  const limit = (PLAN_LIMITS[p] ?? PLAN_LIMITS.free) + bonusPages
  return Math.max(0, limit - used)
}

export function effectiveLimit(plan: string, bonusPages: number = 0): number {
  const p = plan as Plan
  return (PLAN_LIMITS[p] ?? PLAN_LIMITS.free) + bonusPages
}
