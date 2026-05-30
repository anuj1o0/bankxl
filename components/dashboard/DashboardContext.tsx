'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, PLAN_LIMITS } from '@/lib/supabase'

export interface Profile {
  id: string
  email: string
  full_name?: string
  plan: 'free' | 'pro' | 'firm'
  plan_key?: 'pro_monthly' | 'pro_annual' | 'firm_monthly' | 'firm_annual' | null
  bonus_pages?: number
  conversions_this_month: number
  conversions_reset_at: string
  api_key: string
  brand_name?: string
  default_format?: string
  email_notifications?: boolean
  razorpay_customer_id?: string
  razorpay_subscription_id?: string
  subscription_ends_at?: string
  payment_failed_at?: string
  payment_provider?: 'razorpay' | 'lemonsqueezy' | null
  ls_subscription_id?: string
  ls_customer_id?: string
}

export interface EffectiveProfile {
  plan: 'free' | 'pro' | 'firm'
  plan_key?: string | null
  bonus_pages?: number
  conversions_this_month: number
  conversions_reset_at: string
  brand_name?: string
  full_name?: string
  email?: string
}

export interface Conversion {
  id: string
  filename: string
  bank_name?: string
  pages: number
  transactions_extracted: number
  output_format?: string
  status: 'pending' | 'success' | 'failed'
  error_message?: string
  processing_time_ms: number
  file_size_bytes: number
  total_debit?: number
  total_credit?: number
  created_at: string
  completed_at?: string
}

export interface DayPass {
  conversions_remaining: number
  expires_at: string
}

interface Ctx {
  profile: Profile | null
  effectiveProfile: EffectiveProfile | null
  conversions: Conversion[]
  dayPass: DayPass | null
  loading: boolean
  refresh: () => Promise<void>
  pagesLimit: number       // base plan limit
  pagesEffectiveLimit: number  // base + bonus
  pagesUsed: number
  bonusPages: number
  pagesRemaining: number
  effectivePlan: 'free' | 'pro' | 'firm'
  effectivePlanKey: string | null
  isPaid: boolean
  isFirm: boolean
  isTeamMember: boolean
}

const DashboardContext = createContext<Ctx | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [effectiveProfile, setEffectiveProfile] = useState<EffectiveProfile | null>(null)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [dayPass, setDayPass] = useState<DayPass | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login?redirect=/dashboard'); return }
    try {
      const res = await fetch('/api/usage', { cache: 'no-store' })
      if (res.status === 401) {
        await sb.auth.signOut()
        router.push('/login?redirect=/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        // Auth user exists but profile is gone (DB reset, etc.) — sign out cleanly
        if (!data.profile) {
          await sb.auth.signOut()
          router.push('/login?error=profile_missing')
          return
        }
        setProfile(data.profile)
        setEffectiveProfile(data.effective_profile)
        setConversions(data.conversions || [])
        setDayPass(data.day_pass)
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { refresh() }, [refresh])

  const isTeamMember = !!effectiveProfile && profile?.plan === 'free'
  const rawPlan = (effectiveProfile?.plan || profile?.plan || 'free') as 'free' | 'pro' | 'firm'
  // Defensive: if plan_key isn't set on a paid plan (state drift), still show plan but no specific key
  const effectivePlan = rawPlan
  const effectivePlanKey = (effectiveProfile?.plan_key ?? profile?.plan_key) || null
  const pagesLimit = PLAN_LIMITS[effectivePlan]
  const bonusPages = (effectiveProfile?.bonus_pages ?? profile?.bonus_pages) ?? 0
  const pagesEffectiveLimit = pagesLimit + bonusPages
  const pagesUsed = (effectiveProfile?.conversions_this_month ?? profile?.conversions_this_month) ?? 0
  const pagesRemaining = Math.max(0, pagesEffectiveLimit - pagesUsed)
  const isPaid = effectivePlan === 'pro' || effectivePlan === 'firm'
  const isFirm = effectivePlan === 'firm'

  return (
    <DashboardContext.Provider value={{
      profile, effectiveProfile, conversions, dayPass, loading, refresh,
      pagesLimit, pagesEffectiveLimit, pagesUsed, bonusPages, pagesRemaining,
      effectivePlan, effectivePlanKey, isPaid, isFirm, isTeamMember,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}
