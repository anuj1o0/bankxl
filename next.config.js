/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-parse', 'exceljs'],
  },
  // NOTE: do NOT add a www<->apex redirect here without first checking
  // Vercel's dashboard (Project → Settings → Domains). An app-level redirect
  // here fighting a domain-level redirect already configured in Vercel
  // creates an infinite loop (ERR_TOO_MANY_REDIRECTS) — that's exactly what
  // happened on 2026-07-08 when this file redirected www->apex while Vercel
  // was already redirecting apex->www. Consolidate the www/non-www host at
  // the Vercel dashboard level instead (it's also faster — happens at the
  // edge, no function invocation).
}
module.exports = nextConfig
