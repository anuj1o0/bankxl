import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { extractFromPDF, extractFromPDFChunked, mergeAndClean, ExtractionResult } from '@/lib/gemini'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import { bankNameFromFilename } from '@/lib/normalize'

// Hobby plan caps at 60s; Pro plan supports up to 300s. With chunked
// extraction (6 pages per chunk, parallel), even 50-page PDFs finish
// in well under 60s on the Hobby plan.
export const maxDuration = 60
export const runtime = 'nodejs'

type AuthedUser = { id: string; email: string; isDev?: boolean }

async function getUser(): Promise<AuthedUser | null> {
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

async function getEffectiveOwner(userId: string, sb: any): Promise<{ ownerId: string; profile: any } | null> {
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

interface UsageCheck {
  allowed: boolean
  error?: string
  ownerId?: string
  useDayPass?: boolean
  brandName?: string
  pagesRemaining?: number
  plan?: string
  canTopup?: boolean
}

async function checkUsage(user: AuthedUser, format: ExportFormat, pdfPages: number | null): Promise<UsageCheck> {
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

async function recordConversion(user: AuthedUser, file: File, format: ExportFormat): Promise<string | null> {
  if (user.isDev) return null
  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()
    const { data, error } = await sb.from('conversions').insert({
      user_id: user.id,
      filename: file.name,
      file_size_bytes: file.size,
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

async function updateConversion(convId: string | null, fields: Record<string, any>) {
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

async function consumePages(ownerId: string, pages: number, useDayPass: boolean) {
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

async function getPageCount(buffer: Buffer): Promise<number> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const d = await pdfParse(buffer, { max: 0 } as any)
    return d.numpages || 1
  } catch (e) {
    console.warn('pdf-parse failed:', e)
    return 1
  }
}

function isValidFormat(s: any): s is ExportFormat {
  return s === 'excel' || s === 'csv' || s === 'json' || s === 'tally'
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to convert.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request — could not read uploaded file.' }, { status: 400 })
  }

  const file = formData.get('pdf') as File | null
  const requestedFormat = (formData.get('format') as string) || 'excel'
  const format: ExportFormat = isValidFormat(requestedFormat) ? requestedFormat : 'excel'
  const brandFromForm = (formData.get('brandName') as string) || undefined

  if (!file) return NextResponse.json({ error: 'No file received.' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 25 MB.' }, { status: 400 })
  }
  if (file.size < 200) {
    return NextResponse.json({ error: 'File appears to be empty or corrupt.' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Step 1: validate the PDF (magic bytes, encryption, page count). This
  // catches password-protected, corrupt, and not-actually-PDF files with
  // friendly error messages BEFORE we burn any Gemini calls.
  const tPages = Date.now()
  let pageCount: number
  try {
    const info = await validatePdf(fileBuffer)
    pageCount = info.pageCount
    console.log(`[convert] validated: ${Date.now() - tPages}ms (${pageCount} pages, ${(file.size / 1024).toFixed(0)} KB${info.isEncrypted ? ', encrypted' : ''})`)
  } catch (e: any) {
    if (e instanceof PdfValidationError) {
      console.warn(`[convert] PDF validation failed: ${e.userMessage} (${e.detail || '-'})`)
      return NextResponse.json({ error: e.userMessage }, { status: 400 })
    }
    // Fallback to pdf-parse if pdf-lib bombs in some weird way
    pageCount = await getPageCount(fileBuffer)
    if (pageCount < 1) {
      return NextResponse.json({ error: 'Could not read PDF. Make sure the file is a valid, unlocked PDF.' }, { status: 400 })
    }
  }

  // Step 2: usage check using actual page count
  const usage = await checkUsage(user, format, pageCount)
  if (!usage.allowed) {
    return NextResponse.json({
      error: usage.error,
      canTopup: usage.canTopup === true,
    }, { status: 429 })
  }

  // Step 3: insert pending conversion row WITH page count, so even if extraction fails, history shows pages
  const convId = await recordConversion(user, file, format)
  if (convId) {
    await updateConversion(convId, { pages: pageCount })
  }

  // Step 4: extract — chunk large PDFs and run chunks in parallel.
  // 55s hard timeout is a last-resort safety net; extractFromPDFChunked is
  // handed an internal deadline well before that (EXTRACTION_BUDGET_MS) so
  // that under a genuine AI-service slowdown it returns whatever succeeded
  // so far instead of the whole conversion getting killed and losing chunks
  // that already completed. 10s buffer keeps room for DB writes + Excel
  // build before Vercel kills the function at maxDuration.
  const tExtract = Date.now()
  const EXTRACTION_BUDGET_MS = 42000
  const extractionDeadline = tExtract + EXTRACTION_BUDGET_MS
  let extracted: ExtractionResult
  try {
    // Small PDFs (≤ 6 pages) → single Gemini call, no chunking.
    //   - These already finish in 45-50s as one request, no benefit from splitting.
    // Larger PDFs (> 6 pages) → split into 6-page chunks, parallel + sequential
    // retry for any failed chunks. See extractFromPDFChunked() for details.
    //
    // PAGES_PER_CHUNK was 2 for a while (very fast per-chunk latency), but
    // that meant a 178-page statement fired 89 separate Gemini calls — each
    // repeating the full instruction/schema prompt, and each an independent
    // shot at cascading into the expensive gemini-2.5-pro model on retry.
    // 6 pages/chunk cuts call count ~3x for large statements while staying
    // well inside per-call latency limits.
    const CHUNK_THRESHOLD = 6
    const PAGES_PER_CHUNK = 6
    // Both paths get the same deadline — previously only the chunked path
    // had one, so a small PDF whose model cascade ran long was guaranteed
    // to hit the 55s race and fail, while the abandoned Gemini calls kept
    // running (and billing) in the background.
    const extractor = pageCount > CHUNK_THRESHOLD
      ? extractFromPDFChunked(fileBuffer, PAGES_PER_CHUNK, extractionDeadline)
      : extractFromPDF(fileBuffer, false, true, extractionDeadline)

    extracted = await Promise.race([
      extractor,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI extraction timed out. Try a smaller PDF or split it into months.')), 55000)
      ),
    ])
    console.log(`[convert] extraction: ${Date.now() - tExtract}ms (${extracted.transactions.length} tx, ${pageCount} pages${extracted.warning ? ', PARTIAL' : ''})`)
  } catch (err: any) {
    console.error(`[convert] extraction failed after ${Date.now() - tExtract}ms:`, err.message)
    await updateConversion(convId, {
      status: 'failed',
      error_message: String(err.message || err).slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: err.message || 'Could not read this PDF.' }, { status: 500 })
  }

  if (!extracted.transactions.length) {
    await updateConversion(convId, {
      status: 'failed',
      error_message: 'No transactions detected. Make sure this is a real bank statement.',
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({
      error: 'No transactions found. Make sure this is a real bank statement (not an account summary or PIN mailer).'
    }, { status: 422 })
  }

  const merged = mergeAndClean([extracted])
  // mergeAndClean builds a fresh { meta, transactions } object and doesn't
  // know about `.warning` — carry it over so a partial-extraction notice
  // set upstream (extractFromPDFChunked) isn't silently dropped here.
  if (extracted.warning) merged.warning = extracted.warning

  // Last-resort bank name from filename if AI + IFSC both failed.
  if (!merged.meta.bank_name) {
    const fromName = bankNameFromFilename(file.name)
    if (fromName) {
      merged.meta.bank_name = fromName
      console.log(`[convert] bank name resolved from filename: ${fromName}`)
    }
  }

  // Sanity check: low transaction density usually means we missed something.
  // Log it (don't fail) so we can monitor extraction quality across users.
  const txPerPage = merged.transactions.length / Math.max(pageCount, 1)
  if (txPerPage < 1 && pageCount >= 2) {
    console.warn(`[convert] LOW DENSITY WARNING: ${merged.transactions.length} tx across ${pageCount} pages (${txPerPage.toFixed(2)}/page) — may have missed rows`)
  }

  const brandName = brandFromForm || usage.brandName

  let outputBuffer: Buffer
  try {
    if (format === 'excel') {
      outputBuffer = await generateExcel(merged.transactions, merged.meta, { brandName, warning: merged.warning })
    } else if (format === 'csv') {
      outputBuffer = Buffer.from(toCSV(merged.transactions), 'utf8')
    } else if (format === 'json') {
      outputBuffer = Buffer.from(toJSON(merged.transactions, merged.meta, merged.warning), 'utf8')
    } else {
      outputBuffer = Buffer.from(toTallyXML(merged.transactions, merged.meta), 'utf8')
    }
  } catch (err: any) {
    await updateConversion(convId, {
      status: 'failed',
      error_message: 'Failed to build output file: ' + (err.message || ''),
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: 'Failed to build output file.' }, { status: 500 })
  }

  const processingTime = Date.now() - startTime
  let totalDebit = 0, totalCredit = 0
  for (const t of merged.transactions) {
    if (t.debit) totalDebit += t.debit
    if (t.credit) totalCredit += t.credit
  }

  await updateConversion(convId, {
    status: 'success',
    pages: pageCount,
    transactions_extracted: merged.transactions.length,
    processing_time_ms: processingTime,
    bank_name: merged.meta.bank_name,
    total_debit: totalDebit,
    total_credit: totalCredit,
    transactions_json: { meta: merged.meta, transactions: merged.transactions },
    completed_at: new Date().toISOString(),
  })

  if (usage.ownerId) {
    await consumePages(usage.ownerId, pageCount, !!usage.useDayPass)
  }

  const baseFilename = file.name.replace(/\.pdf$/i, '')
  const { mime, ext } = FORMAT_INFO[format]
  const filename = `${baseFilename}_bankxl.${ext}`

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'X-Transactions-Count': String(merged.transactions.length),
    'X-Pages-Count': String(pageCount),
    'X-Processing-Time': String(processingTime),
    'X-Bank-Name': merged.meta.bank_name || '',
    'X-Conversion-Id': convId || '',
    'Cache-Control': 'no-store',
  }
  if (merged.warning) {
    headers['X-Extraction-Warning'] = encodeURIComponent(merged.warning)
  }

  return new NextResponse(new Uint8Array(outputBuffer), { status: 200, headers })
}
