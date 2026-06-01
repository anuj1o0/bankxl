import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  // Auth check
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {}

  // ── 1. Supabase ────────────────────────────────────────────────
  try {
    const t0 = Date.now()
    const sb = createServiceSupabase()
    await sb.from('profiles').select('id', { count: 'exact', head: true })
    results.supabase = { ok: true, latencyMs: Date.now() - t0 }
  } catch (e: any) {
    results.supabase = { ok: false, detail: e.message }
  }

  // ── 2. Gemini API ──────────────────────────────────────────────
  try {
    const t0 = Date.now()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with just the word: ok' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `HTTP ${res.status}`)
    }
    const json = await res.json()
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    results.gemini = { ok: true, latencyMs: Date.now() - t0, detail: reply.trim() }
  } catch (e: any) {
    results.gemini = { ok: false, detail: e.message }
  }

  // ── 3. Razorpay config ─────────────────────────────────────────
  results.razorpay = {
    ok: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    detail: process.env.RAZORPAY_KEY_ID
      ? `Key: ${process.env.RAZORPAY_KEY_ID.slice(0, 12)}…`
      : 'RAZORPAY_KEY_ID not set',
  }

  // ── 4. Lemon Squeezy config ────────────────────────────────────
  results.lemonsqueezy = {
    ok: !!(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID),
    detail: process.env.LEMONSQUEEZY_STORE_ID
      ? `Store: ${process.env.LEMONSQUEEZY_STORE_ID}`
      : 'LEMONSQUEEZY_STORE_ID not set',
  }

  const allOk = Object.values(results).every(r => r.ok)
  return NextResponse.json({ ok: allOk, services: results, checkedAt: new Date().toISOString() })
}
