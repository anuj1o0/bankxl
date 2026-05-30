import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Returns the user's country code.
 * Priority: Vercel header → Cloudflare header → ipapi.co → 'IN' fallback.
 * Used client-side to decide whether to show Razorpay (India) or
 * Lemon Squeezy (international) on the pricing page.
 */
export async function GET(req: NextRequest) {
  // Vercel provides this automatically in production (free, zero latency)
  const vercelCountry = req.headers.get('x-vercel-ip-country')
  if (vercelCountry) {
    return NextResponse.json({ country: vercelCountry, source: 'vercel' })
  }

  // Cloudflare (if proxied through CF)
  const cfCountry = req.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') {
    return NextResponse.json({ country: cfCountry, source: 'cloudflare' })
  }

  // Local dev — detect from x-forwarded-for via ipapi.co
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : null

    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      // Running locally — default to India so devs see the Razorpay flow
      return NextResponse.json({ country: 'IN', source: 'local_default' })
    }

    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'bankxl/1.0' },
      // 2-second timeout so we don't block the page
      signal: AbortSignal.timeout(2000),
    })
    const geo = await res.json()
    const country = (geo.country_code as string) || 'IN'
    return NextResponse.json({ country, source: 'ipapi' })
  } catch {
    return NextResponse.json({ country: 'IN', source: 'error_fallback' })
  }
}
