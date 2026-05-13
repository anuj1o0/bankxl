import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceSupabase()

  // Mark stale pending rows as failed before fetching
  try {
    await sb.rpc('cleanup_stale_pending', { p_user_id: user.id })
  } catch (e) {
    // ignore — function may not be deployed yet, and we still want to return data
  }

  const [profileRes, conversionsRes, dayPassRes, teamMembershipRes] = await Promise.all([
    sb.from('profiles').select('id, plan, plan_key, bonus_pages, conversions_this_month, conversions_reset_at, api_key, full_name, email, razorpay_customer_id, razorpay_subscription_id, subscription_ends_at, payment_failed_at, brand_name, default_format, email_notifications').eq('id', user.id).single(),
    sb.from('conversions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    sb.from('day_passes').select('*').eq('user_id', user.id).gte('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('team_members').select('owner_id, status').eq('member_id', user.id).eq('status', 'active').maybeSingle(),
  ])

  const profile = profileRes.data
  let teamOwnerProfile: any = null

  // If user is on Free plan but is an active member of a Firm team, return effective profile
  if (profile?.plan === 'free' && teamMembershipRes.data?.owner_id) {
    const { data: ownerProfile } = await sb
      .from('profiles')
      .select('plan, plan_key, bonus_pages, conversions_this_month, conversions_reset_at, brand_name, full_name, email')
      .eq('id', teamMembershipRes.data.owner_id)
      .single()
    if (ownerProfile?.plan === 'firm') {
      teamOwnerProfile = ownerProfile
    }
  }

  return NextResponse.json({
    profile,
    effective_profile: teamOwnerProfile, // null unless user is a team member
    conversions: conversionsRes.data || [],
    day_pass: dayPassRes.data,
  })
}
