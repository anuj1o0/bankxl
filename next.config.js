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
  // Canonicalise the apex to www with a PERMANENT (308) redirect.
  //
  // Why this matters for SEO: Vercel's automatic "redirect to production
  // domain" issues a *307 Temporary* redirect for the apex. A temporary
  // redirect tells Google "keep the apex URL, it's only bouncing for now" — so
  // Google never consolidates signals to www and leaves the apex stuck in
  // "Discovered – currently not indexed" (exactly what GSC showed on
  // 2026-07-23). A 308/301 *permanent* redirect is what transfers authority to
  // www and lets the apex drop out of the index.
  //
  // This rule is apex -> www, the SAME direction Vercel already redirects, so
  // it CANNOT loop (www is never redirected here). That's different from the
  // 2026-07-08 incident, which looped only because the app redirected
  // www -> apex while Vercel redirected apex -> www (opposite directions).
  //
  // NOTE: Vercel's edge domain redirect runs before this rule, so for the 308
  // to actually be served the apex domain must be set to "No Redirect / serve"
  // in Vercel → Settings → Domains (or Vercel's own apex redirect must itself
  // be permanent). See the deploy notes accompanying this change.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'banlxlai.com' }],
        destination: 'https://www.banlxlai.com/:path*',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig
