import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  url.pathname = '/auth/callback'
  return NextResponse.redirect(url)
}
