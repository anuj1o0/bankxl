/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-parse', 'exceljs'],
  },
  // Google Search Console showed www.banlxlai.com and banlxlai.com indexed
  // as two separate pages, splitting ranking signal for every URL on the
  // site. banlxlai.com (no www) is canonical per lib/site-url.ts — enforce
  // it with a real 308 redirect so www traffic (and any old bankxlai.com
  // typo traffic that reaches this app) consolidates onto one host.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.banlxlai.com' }],
        destination: 'https://banlxlai.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'bankxlai.com' }],
        destination: 'https://banlxlai.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bankxlai.com' }],
        destination: 'https://banlxlai.com/:path*',
        permanent: true,
      },
    ]
  },
}
module.exports = nextConfig
