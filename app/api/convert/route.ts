import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { extractFromPDF, extractFromPDFChunked, mergeAndClean, ExtractionResult } from '@/lib/gemini'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'

// Hobby plan caps at 60s; Pro plan supports up to 300s. With chunked
// extraction (10 pages per chunk, parallel), even 50-page PDFs finish
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

  // Step 1: get page count first (fast — 1-2s)
  const tPages = Date.now()
  const pageCount = await getPageCount(fileBuffer)
  console.log(`[convert] pdf-parse: ${Date.now() - tPages}ms (${pageCount} pages, ${(file.size / 1024).toFixed(0)} KB)`)
  if (pageCount < 1) {
    return NextResponse.json({ error: 'Could not read PDF. Make sure the file is a valid, unlocked PDF.' }, { status: 400 })
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
  // 50s hard timeout keeps 10s buffer for DB writes + Excel build before
  // Vercel kills the function at maxDuration.
  const tExtract = Date.now()
  let extracted: ExtractionResult
  try {
    // PDFs > 5 pages → split into 5-page chunks, run in parallel.
    // Smaller chunks = faster Gemini response per chunk (less output JSON),
    // higher throughput when running concurrently. A 20-page PDF becomes
    // 4 parallel chunks of ~100-200 tx each, completing in ~25-30s.
    const CHUNK_THRESHOLD = 5
    const extractor = pageCount > CHUNK_THRESHOLD
      ? extractFromPDFChunked(fileBuffer, CHUNK_THRESHOLD)
      : extractFromPDF(fileBuffer)

    extracted = await Promise.race([
      extractor,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI extraction timed out. Try a smaller PDF or split it into months.')), 55000)
      ),
    ])
    console.log(`[convert] extraction: ${Date.now() - tExtract}ms (${extracted.transactions.length} tx, ${pageCount} pages)`)
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
  const brandName = brandFromForm || usage.brandName

  let outputBuffer: Buffer
  try {
    if (format === 'excel') {
      outputBuffer = await generateExcel(merged.transactions, merged.meta, { brandName })
    } else if (format === 'csv') {
      outputBuffer = Buffer.from(toCSV(merged.transactions), 'utf8')
    } else if (format === 'json') {
      outputBuffer = Buffer.from(toJSON(merged.transactions, merged.meta), 'utf8')
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

  return new NextResponse(new Uint8Array(outputBuffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Transactions-Count': String(merged.transactions.length),
      'X-Pages-Count': String(pageCount),
      'X-Processing-Time': String(processingTime),
      'X-Bank-Name': merged.meta.bank_name || '',
      'X-Conversion-Id': convId || '',
      'Cache-Control': 'no-store',
    },
  })
}
