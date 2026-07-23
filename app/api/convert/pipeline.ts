/**
 * app/api/convert/pipeline.ts — shared plumbing for the conversion endpoints.
 *
 * Used by both the legacy single-request route (/api/convert, still the
 * path for small PDFs) and the async chunked flow (/api/convert/start,
 * /chunk, /finalize) that large PDFs use so each Gemini call gets its own
 * serverless invocation instead of racing one shared 60s window.
 */
import type { ExportFormat } from '@/lib/formats'

export type AuthedUser = { id: string; email: string; isDev?: boolean }

export async function getUser(): Promise<AuthedUser | null> {
  try {
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return { id: user.id, email: user.email || '' }
  } catch {}
  if (process.env.SKIP_AUTH === 'true') {
    return { id: 'dev-user', email: 'dev@local.test', isDev: true }
  }
  return null
}

export async function getEffectiveOwner(userId: string, sb: any): Promise<{ ownerId: string; profile: any } | null> {
  const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).single()
  if (!profile) return null
  if (profile.plan !== 'free') return { ownerId: userId, profile }

  const { data: team } = await sb.from('team_members')
    .select('owner_id')
    .eq('member_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (team?.owner_id) {
    const { data: ownerProfile } = await sb.from('profiles').select('*').eq('id', team.owner_id).single()
    if (ownerProfile?.plan === 'firm') {
      return { ownerId: team.owner_id, profile: ownerProfile }
    }
  }
  return { ownerId: userId, profile }
}

export interface UsageCheck {
  allowed: boolean
  error?: string
  ownerId?: string
  useDayPass?: boolean
  brandName?: string
  pagesRemaining?: number
  plan?: string
  canTopup?: boolean
}

export async function checkUsage(user: AuthedUser, format: ExportFormat, pdfPages: number | null): Promise<UsageCheck> {
  if (user.isDev) return { allowed: true, ownerId: user.id, pagesRemaining: Infinity, plan: 'firm' }
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const { PLAN_LIMITS, isFormatAllowed } = await import('@/lib/supabase')
    const sb = createServiceSupabase()

    const eff = await getEffectiveOwner(user.id, sb)
    if (!eff) return { allowed: false, error: 'Profile not found. Try signing out and back in.' }
    const { ownerId, profile } = eff

    if (new Date(profile.conversions_reset_at) <= new Date()) {
      const next = new Date()
      next.setMonth(next.getMonth() + 1)
      next.setDate(1)
      next.setHours(0, 0, 0, 0)
      await sb.from('profiles').update({
        conversions_this_month: 0,
        bonus_pages: 0,                  // top-up pages also expire on monthly reset
        conversions_reset_at: next.toISOString(),
      }).eq('id', ownerId)
      profile.conversions_this_month = 0
      profile.bonus_pages = 0
    }

    if (!isFormatAllowed(profile.plan, format)) {
      return { allowed: false, error: `${format.toUpperCase()} export needs Pro. Upgrade for ₹499/mo to unlock all formats.` }
    }

    const baseLimit = PLAN_LIMITS[profile.plan as keyof typeof PLAN_LIMITS]
    const bonusPages = profile.bonus_pages ?? 0
    const limit = baseLimit + bonusPages
    const used = profile.conversions_this_month ?? 0
    const remainingMonth = Math.max(0, limit - used)

    // Check active day passes
    const { data: pass } = await sb.from('day_passes')
      .select('id, conversions_remaining, expires_at')
      .eq('user_id', ownerId)
      .gt('conversions_remaining', 0)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const passRemaining = pass?.conversions_remaining ?? 0

    const totalRemaining = remainingMonth + passRemaining

    if (totalRemaining === 0) {
      return {
        allowed: false,
        error: profile.plan === 'free'
          ? `You've used all ${baseLimit} pages this month. Upgrade to Pro for 800 pages/mo or buy ₹100 for 60 extra pages.`
          : `You've used all ${baseLimit} pages this month${bonusPages > 0 ? ` (plus ${bonusPages} bonus)` : ''}. Buy ₹100 for 60 more pages or upgrade your plan.`,
        canTopup: true,
      }
    }

    // If we know the page count and it exceeds remaining, block before extraction
    if (pdfPages !== null && pdfPages > totalRemaining) {
      return {
        allowed: false,
        error: `This PDF has ${pdfPages} pages but you only have ${totalRemaining} left this month. Buy ₹100 for 60 extra pages, or upgrade your plan.`,
        canTopup: true,
      }
    }

    return {
      allowed: true,
      ownerId,
      useDayPass: remainingMonth === 0 && passRemaining > 0,
      brandName: profile.plan === 'firm' ? profile.brand_name : undefined,
      pagesRemaining: totalRemaining,
      plan: profile.plan,
    }
  } catch (e: any) {
    console.error('checkUsage error:', e?.message)
    return { allowed: true, ownerId: user.id, pagesRemaining: 999999 }
  }
}

export async function recordConversion(user: AuthedUser, filename: string, fileSize: number, format: ExportFormat): Promise<string | null> {
  if (user.isDev) return null
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    const { data, error } = await sb.from('conversions').insert({
      user_id: user.id,
      filename,
      file_size_bytes: fileSize,
      output_format: format,
      status: 'pending',
    }).select('id').single()
    if (error) console.error('recordConversion insert error:', error.message)
    return data?.id ?? null
  } catch (e: any) {
    console.error('recordConversion exception:', e?.message)
    return null
  }
}

export async function updateConversion(convId: string | null, fields: Record<string, any>) {
  if (!convId) return
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    const { error } = await sb.from('conversions').update(fields).eq('id', convId)
    if (error) console.error('updateConversion error:', error.message)
  } catch (e: any) {
    console.error('updateConversion exception:', e?.message)
  }
}

// Fetch a conversion row and confirm it belongs to this user and is still
// an in-flight ('pending') conversion started recently. The chunk/finalize
// endpoints call this so a conversion ID can't be replayed indefinitely or
// used by another account to run extractions on our API key.
export async function getOwnedPendingConversion(user: AuthedUser, conversionId: string, maxAgeMinutes = 20): Promise<{ ok: true; row: any } | { ok: false; error: string; status: number }> {
  if (user.isDev) return { ok: true, row: null }
  if (!conversionId) return { ok: false, error: 'Missing conversion ID.', status: 400 }
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    const { data: row } = await sb.from('conversions')
      .select('id, user_id, status, created_at, pages, output_format, filename')
      .eq('id', conversionId)
      .maybeSingle()
    if (!row || row.user_id !== user.id) {
      return { ok: false, error: 'Conversion not found.', status: 404 }
    }
    if (row.status !== 'pending') {
      return { ok: false, error: 'This conversion has already finished. Start a new one.', status: 409 }
    }
    const ageMs = Date.now() - new Date(row.created_at).getTime()
    if (ageMs > maxAgeMinutes * 60 * 1000) {
      return { ok: false, error: 'This conversion expired. Please upload the PDF again.', status: 410 }
    }
    return { ok: true, row }
  } catch (e: any) {
    console.error('getOwnedPendingConversion error:', e?.message)
    return { ok: false, error: 'Could not verify conversion.', status: 500 }
  }
}

export async function consumePages(ownerId: string, pages: number, useDayPass: boolean) {
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    let remaining = pages

    if (useDayPass && remaining > 0) {
      const { data: pass } = await sb.from('day_passes')
        .select('id, conversions_remaining')
        .eq('user_id', ownerId)
        .gt('conversions_remaining', 0)
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (pass) {
        const consume = Math.min(pass.conversions_remaining, remaining)
        await sb.from('day_passes').update({ conversions_remaining: pass.conversions_remaining - consume }).eq('id', pass.id)
        remaining -= consume
      }
    }

    if (remaining > 0) {
      const { error } = await sb.rpc('add_pages_used', { p_user_id: ownerId, p_pages: remaining })
      if (error) {
        const { data } = await sb.from('profiles').select('conversions_this_month').eq('id', ownerId).single()
        if (data) {
          await sb.from('profiles')
            .update({ conversions_this_month: (data.conversions_this_month ?? 0) + remaining })
            .eq('id', ownerId)
        }
      }
    }
  } catch (e: any) {
    console.error('consumePages error:', e?.message)
  }
}

export function isValidFormat(s: any): s is ExportFormat {
  return s === 'excel' || s === 'csv' || s === 'json' || s === 'tally'
}

// ─── Parser failure telemetry ────────────────────────────────────────────────
// Records a diagnostic row when the deterministic engine DECLINES a statement,
// so we can see which banks/formats/stages need parser work. STRICTLY non-PII:
// pass only structural signals (bank name, page count, failure code/stage,
// confidence, reconciliation counts). NEVER pass transactions, amounts, names,
// account numbers, the filename, or the file — those must never reach this table.
export interface ParserFailureRecord {
  userId: string
  bankDetected?: string | null
  pageCount?: number | null
  fileSizeBytes?: number | null
  failureCode: string
  failureStage?: string | null
  failureMessage?: string | null
  parserVersion?: string | null
  confidence?: number | null
  reconciledLinks?: number | null
  checkableLinks?: number | null
  breaks?: number | null
  transactionsExtracted?: number | null
  formatRequested?: string | null
  sampleShared?: boolean
  samplePath?: string | null
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export async function recordParserFailure(rec: ParserFailureRecord): Promise<string | null> {
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    const { data, error } = await sb.from('parser_failures').insert({
      // dev-user and any non-uuid id become null (FK is auth.users).
      user_id: looksLikeUuid(rec.userId) ? rec.userId : null,
      bank_detected: rec.bankDetected ?? null,
      page_count: rec.pageCount ?? null,
      file_size_bytes: rec.fileSizeBytes ?? null,
      failure_code: rec.failureCode,
      failure_stage: rec.failureStage ?? null,
      // Truncate: these are structural dev messages, but cap length defensively.
      failure_message: rec.failureMessage ? rec.failureMessage.slice(0, 300) : null,
      parser_version: rec.parserVersion ?? null,
      confidence: rec.confidence ?? null,
      reconciled_links: rec.reconciledLinks ?? null,
      checkable_links: rec.checkableLinks ?? null,
      breaks: rec.breaks ?? null,
      transactions_extracted: rec.transactionsExtracted ?? null,
      format_requested: rec.formatRequested ?? null,
      sample_shared: rec.sampleShared ?? false,
      sample_path: rec.samplePath ?? null,
    }).select('id').single()
    // Fails harmlessly (logged) until migration 003 is applied — never blocks
    // the user-facing response.
    if (error) console.error('recordParserFailure error:', error.message)
    return data?.id ?? null
  } catch (e: any) {
    console.error('recordParserFailure exception:', e?.message)
    return null
  }
}

// Shared constants for the chunked flow — the client orchestrator mirrors
// these (lib/convert-client.ts); keep them in sync.
//
// Sizing is driven by MEASURED output-generation speed (~275 tokens/sec on
// flash-lite) against worst-case statement density (~49 tx/page on the
// stress-test PDF, ~58 output tokens per tx in the compact array format):
//   3 pages ≈ 147 tx ≈ 8.5K tokens ≈ ~31s — fits the 45s per-call timeout
//   4+ pages of a dense statement did NOT fit (measured 74s for 4 pages in
//   the old keyed-object format; even compact would be marginal).
// Extra chunks are cheap in the async flow — each gets its own serverless
// invocation, and the only added cost is the ~1.3K-token prompt per call.
export const CHUNK_THRESHOLD = 3   // ≤ this many pages → single-call path
export const PAGES_PER_CHUNK = 3
