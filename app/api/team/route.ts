import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

const MAX_TEAM_SIZE = 5

async function getOwner(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const
  const sb = createServiceSupabase()
  const { data: profile } = await sb.from('profiles').select('plan, email').eq('id', user.id).single()
  if (profile?.plan !== 'firm') return { error: 'Team management requires the Firm plan.', status: 403 } as const
  return { user, profile, sb } as const
}

export async function GET(req: NextRequest) {
  const ctx = await getOwner(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { data: members } = await ctx.sb
    .from('team_members')
    .select('id, member_email, member_id, status, invited_at, accepted_at')
    .eq('owner_id', ctx.user.id)
    .neq('status', 'removed')
    .order('invited_at', { ascending: false })
  return NextResponse.json({ members: members || [], max: MAX_TEAM_SIZE })
}

export async function POST(req: NextRequest) {
  const ctx = await getOwner(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = await req.json().catch(() => ({}))
  const email = (body.email || '').toLowerCase().trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }
  if (email === ctx.profile.email?.toLowerCase()) {
    return NextResponse.json({ error: "You're already on your own team." }, { status: 400 })
  }

  const { count } = await ctx.sb
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ctx.user.id)
    .neq('status', 'removed')

  if ((count || 0) >= MAX_TEAM_SIZE) {
    return NextResponse.json({ error: `Team is full (${MAX_TEAM_SIZE} members max). Remove someone first.` }, { status: 400 })
  }

  // If user already exists, link them immediately
  const { data: existing } = await ctx.sb.from('profiles').select('id').eq('email', email).maybeSingle()

  const { data, error } = await ctx.sb.from('team_members').upsert({
    owner_id: ctx.user.id,
    member_email: email,
    member_id: existing?.id ?? null,
    status: existing ? 'active' : 'invited',
    invited_at: new Date().toISOString(),
    accepted_at: existing ? new Date().toISOString() : null,
  }, { onConflict: 'owner_id,member_email' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOwner(req)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing member id.' }, { status: 400 })

  const { error } = await ctx.sb.from('team_members')
    .update({ status: 'removed' })
    .eq('id', id)
    .eq('owner_id', ctx.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
