import type { Metadata, Viewport } from 'next'
import { ThemeProvider, NO_FLASH_SCRIPT } from '@/components/Theme'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://banlxlai.com'
const OG_IMAGE = `${APP_URL}/api/og`

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'BankXL — Bank Statement PDF to Excel Converter for Indian CAs',
    template: '%s | BankXL',
  },
  description: 'Convert any bank statement PDF to clean Excel in 15 seconds. Supports SBI, HDFC, ICICI, Axis, Kotak & 500+ banks. Excel, CSV, JSON & Tally XML export. Free 50 pages/month — no card needed.',
  keywords: [
    'bank statement to excel',
    'bank statement pdf to excel converter',
    'pdf to excel converter india',
    'sbi statement to excel',
    'hdfc statement to excel',
    'icici bank statement converter',
    'axis bank statement to excel',
    'kotak bank statement converter',
    'bank statement converter for ca',
    'tally xml bank statement import',
    'bank statement pdf to csv',
    'ca software india',
    'pdf bank statement extractor',
    'bank statement data extraction',
    'convert bank statement automatically',
    'bank statement to excel free',
    'bank statement converter',
    'bank statement ocr',
    'chartered accountant software india',
    'bank statement automation tool',
  ],
  authors: [{ name: 'BankXL', url: APP_URL }],
  creator: 'BankXL',
  publisher: 'BankXL',
  category: 'Finance Software',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'BankXL — Bank Statement PDF to Excel in 15 Seconds',
    description: 'Bank statement PDF to Excel converter trusted by 1,200+ Indian CAs. Supports SBI, HDFC, ICICI, Axis, Kotak & 500+ banks. Excel, CSV, JSON, Tally XML. Free to try.',
    url: APP_URL,
    siteName: 'BankXL',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'BankXL — Bank Statement PDF to Excel Converter' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BankXL — Bank Statement PDF to Excel in 15 Seconds',
    description: 'Bank statement converter for Indian CAs. SBI, HDFC, ICICI, Axis, Kotak & 500+ banks. Free to try.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // SVG-only favicons don't render in a lot of real-world contexts that
  // matter for a link's "logo" — WhatsApp/LinkedIn/Slack link-preview
  // crawlers, Google's favicon next to search results, older browsers, and
  // "Add to Home Screen" all expect PNG/ICO. Full fallback set generated
  // from app/favicon.svg (same mark used in components/Logo.tsx).
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  // Uncomment and fill in after verifying site in Google Search Console:
  // verification: { google: 'YOUR_VERIFICATION_CODE_HERE' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0d14' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationLD = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BankXL',
    url: APP_URL,
    // Google's structured-data guidelines require a raster logo (min
    // 112x112) — SVG isn't supported here even though it's fine for the
    // HTML <link rel="icon">, which is why this used favicon.svg before and
    // likely wasn't rendering in Search's Knowledge Panel / rich results.
    logo: `${APP_URL}/icon-512.png`,
    description: 'Bank statement PDF to Excel converter for Indian CAs and accountants.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@banlxlai.com',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi'],
    },
  }

  const websiteLD = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BankXL',
    url: APP_URL,
    description: 'Convert bank statement PDFs to Excel, CSV, JSON or Tally XML in seconds.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/banks?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  const softwareLD = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BankXL',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Finance',
    operatingSystem: 'Web Browser',
    url: APP_URL,
    description: 'Bank statement PDF to Excel, CSV, JSON and Tally XML converter for Indian chartered accountants and bookkeepers.',
    featureList: [
      'Convert bank statement PDF to Excel',
      'Convert bank statement PDF to CSV',
      'Tally XML export for direct import',
      'Works with SBI, HDFC, ICICI, Axis, Kotak and 500+ banks',
      'OCR for scanned PDFs',
      'Team collaboration for CA firms',
      'Bulk conversion of multiple statements',
    ],
    screenshot: OG_IMAGE,
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Plan',
        price: '0',
        priceCurrency: 'INR',
        description: '50 pages every month, no credit card required',
      },
      {
        '@type': 'Offer',
        name: 'Pro Monthly',
        price: '499',
        priceCurrency: 'INR',
        description: '800 pages per month for active accountants',
      },
      {
        '@type': 'Offer',
        name: 'Firm Monthly',
        price: '4999',
        priceCurrency: 'INR',
        description: '8,000 pages per month with team seats and bulk upload for CA firms',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '312',
      bestRating: '5',
      worstRating: '1',
    },
    inLanguage: 'en-IN',
    isAccessibleForFree: true,
  }

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLD) }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
