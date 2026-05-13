import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { toCSV, toJSON, toTallyXML, FORMAT_INFO, ExportFormat } from '@/lib/formats'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 30

function isValidFormat(s: any): s is ExportFormat {
  return s === 'excel' || s === 'csv' || s === 'json' || s === 'tally'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const requested = url.searchParams.get('format') || 'excel'
  const format: ExportFormat = isValidFormat(requested) ? requested : 'excel'

  const sb = createServiceSupabase()
  const { data: row } = await sb.from('conversions')
    .select('id, user_id, filename, transactions_json, output_format')
    .eq('id', params.id)
    .single()

  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!row.transactions_json) {
    return NextResponse.json({ error: 'Original data no longer available. Please convert again.' }, { status: 410 })
  }

  // Plan-aware format gate
  const { data: profile } = await sb.from('profiles').select('plan, brand_name').eq('id', user.id).single()
  const { isFormatAllowed } = await import('@/lib/supabase')
  if (!isFormatAllowed(profile?.plan || 'free', format)) {
    return NextResponse.json({ error: `${format.toUpperCase()} export needs Pro.` }, { status: 403 })
  }

  const { meta, transactions } = row.transactions_json
  let outputBuffer: Buffer
  if (format === 'excel') {
    outputBuffer = await generateExcel(transactions, meta, { brandName: profile?.plan === 'firm' ? profile.brand_name : undefined })
  } else if (format === 'csv') {
    outputBuffer = Buffer.from(toCSV(transactions), 'utf8')
  } else if (format === 'json') {
    outputBuffer = Buffer.from(toJSON(transactions, meta), 'utf8')
  } else {
    outputBuffer = Buffer.from(toTallyXML(transactions, meta), 'utf8')
  }

  const { mime, ext } = FORMAT_INFO[format]
  const baseName = (row.filename || 'statement').replace(/\.pdf$/i, '')

  return new NextResponse(new Uint8Array(outputBuffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${baseName}_bankxl.${ext}"`,
      'Cache-Control': 'no-store',
    },
  })
}
