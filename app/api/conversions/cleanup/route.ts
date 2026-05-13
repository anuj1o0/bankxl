import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

// Manually mark all stale pending conversions for the current user as failed.
// Called from the History page's "Clear stuck conversions" button.
export async function POST() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceSupabase()

  // First try the SQL function (5 min threshold)
  let cleaned = 0
  try {
    const { data } = await sb.rpc('cleanup_stale_pending', { p_user_id: user.id })
    cleaned = typeof data === 'number' ? data : 0
  } catch {}

  // Hard fallback: anything pending older than 2 minutes is treated as abandoned
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: rows, error } = await sb
    .from('conversions')
    .update({
      status: 'failed',
      error_message: 'Conversion timed out or was abandoned',
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ cleaned: Math.max(cleaned, rows?.length ?? 0) })
}
