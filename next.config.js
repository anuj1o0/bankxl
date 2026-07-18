/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    // pdfjs-dist must stay UNBUNDLED: Next's server bundler copies the
    // library into .next/server/vendor-chunks but not its pdf.worker.mjs
    // companion, and pdfjs's worker setup then fails at runtime ("Cannot
    // find module '...vendor-chunks/pdf.worker.mjs'"). Loading it from
    // node_modules keeps the worker file next to the library.
    serverComponentsExternalPackages: ['sharp', 'pdf-parse', 'exceljs', 'pdfjs-dist', 'canvas', 'tesseract.js'],
    outputFileTracingIncludes: {
      '/api/convert/local': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    },
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
