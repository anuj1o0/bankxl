import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, any> = {}

  if (typeof body.full_name === 'string') update.full_name = body.full_name.slice(0, 100)
  if (typeof body.brand_name === 'string') update.brand_name = body.brand_name.slice(0, 80) || null
  if (['excel', 'csv', 'json', 'tally'].includes(body.default_format)) update.default_format = body.default_format
  if (typeof body.email_notifications === 'boolean') update.email_notifications = body.email_notifications

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const sb = createServiceSupabase()

  // Brand name + Firm-only check
  if ('brand_name' in update) {
    const { data: profile } = await sb.from('profiles').select('plan').eq('id', user.id).single()
    if (profile?.plan !== 'firm' && update.brand_name) {
      return NextResponse.json({ error: 'White-label brand name requires the Firm plan.' }, { status: 403 })
    }
  }

  update.updated_at = new Date().toISOString()
  const { error } = await sb.from('profiles').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  // Regenerate API key
  const url = new URL(req.url)
  if (url.searchParams.get('action') !== 'regenerate_api_key') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceSupabase()
  const { data: profile } = await sb.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'firm') {
    return NextResponse.json({ error: 'API access requires the Firm plan.' }, { status: 403 })
  }

  const newKey = 'bxl_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const { error } = await sb.from('profiles').update({ api_key: newKey, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ api_key: newKey })
}
