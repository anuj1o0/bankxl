import { NextRequest, NextResponse } from 'next/server'
import { validatePdf, PdfValidationError } from '@/lib/pdf-validation'
import type { ExportFormat } from '@/lib/formats'
import {
  getUser, checkUsage, recordConversion, updateConversion,
  isValidFormat, PAGES_PER_CHUNK,
} from '../pipeline'

// Step 1 of the chunked conversion flow (large PDFs).
//
// Validates the PDF and the user's quota ONCE, creates the conversion row,
// and hands the client a chunk plan. The client then splits the PDF locally
// (it already has the file — re-uploading 30 slices of a 25 MB statement
// would be wasteful) and processes each slice via /api/convert/chunk, where
// every chunk gets its own serverless invocation. This is what frees large
// statements from the single 60-second window that used to make them fail:
// no Gemini call happens in this request at all.
export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
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

  let pageCount: number
  try {
    const info = await validatePdf(fileBuffer)
    pageCount = info.pageCount
  } catch (e: any) {
    if (e instanceof PdfValidationError) {
      return NextResponse.json({ error: e.userMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not read PDF. Make sure the file is a valid, unlocked PDF.' }, { status: 400 })
  }

  const usage = await checkUsage(user, format, pageCount)
  if (!usage.allowed) {
    return NextResponse.json({
      error: usage.error,
      canTopup: usage.canTopup === true,
    }, { status: 429 })
  }

  const convId = await recordConversion(user, file.name, file.size, format)
  if (convId) {
    await updateConversion(convId, { pages: pageCount })
  }

  return NextResponse.json({
    conversionId: convId,          // null in dev mode (SKIP_AUTH)
    pageCount,
    pagesPerChunk: PAGES_PER_CHUNK,
    chunkCount: Math.ceil(pageCount / PAGES_PER_CHUNK),
    brandName: usage.brandName ?? null,
  })
}
