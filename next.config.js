/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'pdf-parse', 'exceljs', 'pdfjs-dist'],
  },
}
module.exports = nextConfig
