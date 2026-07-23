import { NextRequest, NextResponse } from 'next/server'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import { getUser, recordParserFailure } from '../convert/pipeline'

// Opt-in failed-sample capture. This endpoint runs ONLY when a signed-in user
// explicitly clicks "send us this statement" after a failed conversion — it is
// never called automatically. The file is stored in the PRIVATE 'failed-samples'
// bucket (no public URLs, service-role read only) purely so we can reproduce the
// failure and fix the parser. This is the single consented exception to the
// otherwise-absolute "we never store your files" promise, and it's disclosed in
// the privacy policy. We store the file under a random path (never the original
// filename, which can contain a name), and record only structural metadata.
export const maxDuration = 30
export const runtime = 'nodejs'

const BUCKET = 'failed-samples'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 })
  }

  const file = formData.get('pdf') as File | null
  const bankHint = ((formData.get('bank') as string) || '').slice(0, 120) || null
  const failureCode = ((formData.get('failureCode') as string) || 'USER_REPORTED').slice(0, 60)

  if (!file) return NextResponse.json({ error: 'No file received.' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files can be shared.' }, { status: 400 })
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 25 MB).' }, { status: 400 })
  }
  if (file.size < 200) {
    return NextResponse.json({ error: 'File appears to be empty.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Confirm it's a real PDF (and grab page count for the telemetry row).
  let pageCount: number | null = null
  try {
    pageCount = (await validatePdf(buffer)).pageCount
  } catch (e: any) {
    if (e instanceof PdfValidationError) {
      return NextResponse.json({ error: e.userMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not read that PDF.' }, { status: 400 })
  }

  // Dev users have no real Supabase identity / storage — accept and no-op.
  if (user.isDev) return NextResponse.json({ ok: true })

  try {
    const { createServiceSupabase } = await import('@/lib/supabase-server')
    const sb = createServiceSupabase()

    // Ensure the private bucket exists (self-healing if the migration's bucket
    // insert hasn't been run). Ignore "already exists".
    await sb.storage.createBucket(BUCKET, { public: false }).catch(() => {})

    // Random path — never the original filename (can contain the account
    // holder's name). Namespaced by user for easy cleanup after resolving.
    const rand = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random().toString(16).slice(2)}`)
    const path = `${user.id}/${Date.now()}_${rand}.pdf`

    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })
    if (upErr) {
      console.error('report-statement upload error:', upErr.message)
      return NextResponse.json({ error: 'Could not save the sample. Please try again.' }, { status: 500 })
    }

    await recordParserFailure({
      userId: user.id,
      bankDetected: bankHint,
      pageCount,
      fileSizeBytes: file.size,
      failureCode,
      failureStage: 'user-reported',
      parserVersion: null,
      formatRequested: null,
      sampleShared: true,
      samplePath: path,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('report-statement exception:', e?.message)
    return NextResponse.json({ error: 'Something went wrong sharing the sample.' }, { status: 500 })
  }
}
