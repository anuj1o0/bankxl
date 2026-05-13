import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { extractFromPDF, mergeAndClean } from '@/lib/gemini'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'

export const maxDuration = 60
export const runtime = 'nodejs'

function isValidFormat(s: any): s is ExportFormat {
  return s === 'excel' || s === 'csv' || s === 'json' || s === 'tally'
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || (req.headers.get('x-api-key') || '').trim()
  if (!token) return { error: 'Missing API key. Set Authorization: Bearer <key> header.', status: 401 }

  const { createServiceSupabase } = await import('@/lib/supabase-server')
  const serviceClient = createServiceSupabase()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, plan, api_key, conversions_this_month, conversions_reset_at')
    .eq('api_key', token)
    .maybeSingle()

  if (!profile) return { error: 'Invalid API key.', status: 401 }
  if (profile.plan !== 'firm') {
    return { error: 'API access requires the Firm plan.', status: 403 }
  }

  return { profile, serviceClient }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const auth = await authenticate(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(req.url)
  const requestedFormat = url.searchParams.get('format') || 'json'
  const format: ExportFormat = isValidFormat(requestedFormat) ? requestedFormat : 'json'

  const contentType = req.headers.get('content-type') || ''
  let pdfBuffer: Buffer
  let filename = 'statement.pdf'

  try {
    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      const file = fd.get('pdf') as File | null
      if (!file) return NextResponse.json({ error: 'No file. Send "pdf" field as multipart/form-data.' }, { status: 400 })
      filename = file.name
      pdfBuffer = Buffer.from(await file.arrayBuffer())
    } else if (contentType.includes('application/pdf')) {
      const ab = await req.arrayBuffer()
      pdfBuffer = Buffer.from(ab)
    } else {
      return NextResponse.json({
        error: 'Send PDF as multipart/form-data (field name "pdf") or raw application/pdf body.',
      }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not read request body.' }, { status: 400 })
  }

  if (pdfBuffer.length > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 25 MB).' }, { status: 400 })
  }

  let result
  try {
    result = await extractFromPDF(pdfBuffer)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Extraction failed.' }, { status: 500 })
  }

  if (!result.transactions.length) {
    return NextResponse.json({ error: 'No transactions found in this PDF.' }, { status: 422 })
  }
  const merged = mergeAndClean([result])

  if (format === 'json') {
    return NextResponse.json({
      meta: merged.meta,
      transactions: merged.transactions,
      processing_time_ms: Date.now() - startTime,
    }, {
      headers: { 'X-RateLimit-Remaining': 'unlimited' },
    })
  }

  let outputBuffer: Buffer
  if (format === 'excel') {
    outputBuffer = await generateExcel(merged.transactions, merged.meta)
  } else if (format === 'csv') {
    outputBuffer = Buffer.from(toCSV(merged.transactions), 'utf8')
  } else {
    outputBuffer = Buffer.from(toTallyXML(merged.transactions, merged.meta), 'utf8')
  }

  const { mime, ext } = FORMAT_INFO[format]
  const baseName = filename.replace(/\.pdf$/i, '')
  // record to api_logs (best effort)
  try {
    await auth.serviceClient.from('api_logs').insert({
      user_id: auth.profile.id,
      endpoint: '/api/v1/convert',
      status: 200,
      processing_time_ms: Date.now() - startTime,
      transactions: merged.transactions.length,
    })
  } catch {}

  return new NextResponse(new Uint8Array(outputBuffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${baseName}.${ext}"`,
      'X-Transactions-Count': String(merged.transactions.length),
      'X-Processing-Time': String(Date.now() - startTime),
    },
  })
}

export async function GET() {
  return NextResponse.json({
    name: 'BankXL Convert API',
    version: '1',
    docs: '/api-docs',
    methods: ['POST'],
    formats: ['json', 'excel', 'csv', 'tally'],
  })
}
