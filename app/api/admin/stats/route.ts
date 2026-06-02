import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  // Auth — must be logged in as admin
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sb = createServiceSupabase()

  const now = new Date()
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart    = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    totalUsersRes,
    planBreakdownRes,
    signupsTodayRes,
    signupsWeekRes,
    signupsMonthRes,
    recentSignupsRes,
    totalConversionsRes,
    pagesThisMonthRes,
    recentConversionsRes,
    failedPaymentsRes,
    bankUsageRes,
    dayPassesTotalRes,
    dayPassesMonthRes,
    topupMonthRes,
    apiLogsRes,
  ] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('profiles').select('plan, payment_provider, created_at'),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('profiles')
      .select('id, email, full_name, plan, plan_key, created_at, payment_provider')
      .order('created_at', { ascending: false })
      .limit(12),
    sb.from('conversions').select('*', { count: 'exact', head: true }).eq('status', 'success'),
    sb.from('conversions').select('pages').eq('status', 'success').gte('created_at', monthStart),
    sb.from('conversions')
      .select('id, user_id, filename, bank_name, pages, status, output_format, processing_time_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    sb.from('profiles')
      .select('id, email, plan, payment_failed_at, payment_provider')
      .not('payment_failed_at', 'is', null)
      .order('payment_failed_at', { ascending: false })
      .limit(5),
    sb.from('conversions')
      .select('bank_name')
      .eq('status', 'success')
      .not('bank_name', 'is', null),
    sb.from('day_passes').select('*', { count: 'exact', head: true }),
    sb.from('day_passes').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('profiles').select('bonus_pages').gte('updated_at', monthStart),
    sb.from('api_logs')
      .select('status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // Plan breakdown
  type PlanRow = { plan: string; payment_provider: string | null; created_at: string }
  const planData = (planBreakdownRes.data || []) as PlanRow[]
  const plans = { free: 0, pro: 0, firm: 0 }
  const providers = { razorpay: 0, lemonsqueezy: 0 }
  planData.forEach((p: PlanRow) => {
    if (p.plan in plans) plans[p.plan as keyof typeof plans]++
    if (p.payment_provider === 'razorpay') providers.razorpay++
    if (p.payment_provider === 'lemonsqueezy') providers.lemonsqueezy++
  })

  // Signups by day (last 7 days)
  const signupsByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
    signupsByDay[key] = 0
  }
  planData.forEach((p: PlanRow) => {
    const d = new Date(p.created_at)
    if (d >= new Date(weekStart)) {
      const key = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
      if (key in signupsByDay) signupsByDay[key]++
    }
  })

  // MRR
  const mrr = plans.pro * 499 + plans.firm * 4999

  // Pages this month
  const pagesThisMonth = (pagesThisMonthRes.data || []).reduce((s: number, r: { pages: number | null }) => s + (r.pages || 0), 0)

  // Bank usage
  const bankCounts: Record<string, number> = {}
  ;(bankUsageRes.data || []).forEach((c: { bank_name: string | null }) => {
    const b = c.bank_name || 'Unknown'
    bankCounts[b] = (bankCounts[b] || 0) + 1
  })
  const topBanks = Object.entries(bankCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([bank, count]) => ({ bank, count }))

  // API success rate (last 100 calls)
  const logs = apiLogsRes.data || []
  const apiSuccessRate = logs.length
    ? Math.round((logs.filter((l: { status: number }) => l.status < 400).length / logs.length) * 100)
    : null

  return NextResponse.json({
    overview: {
      totalUsers:        totalUsersRes.count    ?? 0,
      signupsToday:      signupsTodayRes.count  ?? 0,
      signupsThisWeek:   signupsWeekRes.count   ?? 0,
      signupsThisMonth:  signupsMonthRes.count  ?? 0,
      totalConversions:  totalConversionsRes.count ?? 0,
      pagesThisMonth,
      dayPassesTotal:    dayPassesTotalRes.count ?? 0,
      dayPassesThisMonth: dayPassesMonthRes.count ?? 0,
      mrr,
    },
    plans,
    providers,
    signupsByDay,
    recentSignups:      recentSignupsRes.data      ?? [],
    recentConversions:  recentConversionsRes.data  ?? [],
    failedPayments:     failedPaymentsRes.data     ?? [],
    topBanks,
    apiSuccessRate,
  })
}
