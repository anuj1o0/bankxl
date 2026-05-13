import type { Metadata, Viewport } from 'next'
import { ThemeProvider, NO_FLASH_SCRIPT } from '@/components/Theme'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bankxl.in'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'BankXL — Bank Statement PDF to Excel Converter',
    template: '%s | BankXL',
  },
  description: 'Convert any bank statement PDF to clean, formatted Excel in 15 seconds. Supports SBI, HDFC, ICICI, Axis & 100+ banks. Excel, CSV, JSON & Tally export. ₹299/mo unlimited.',
  keywords: [
    'bank statement to excel', 'pdf to excel converter', 'CA software India',
    'HDFC statement converter', 'SBI statement converter', 'ICICI statement to excel',
    'Tally import bank statement', 'bank statement converter India', 'AI bank statement',
    'pdf to xlsx', 'pdf to csv', 'bank statement pdf to excel free',
  ],
  authors: [{ name: 'BankXL' }],
  creator: 'BankXL',
  publisher: 'BankXL',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'BankXL — Bank Statement PDF to Excel in 15 seconds',
    description: 'AI-powered bank statement converter trusted by 1,200+ Indian CAs. Excel, CSV, JSON, Tally. From ₹299/mo for 5,000 pages.',
    url: APP_URL,
    siteName: 'BankXL',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BankXL — Bank Statement PDF to Excel',
    description: 'Convert any bank statement PDF to formatted Excel in 15 seconds.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
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
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BankXL',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Bank statement PDF to Excel/CSV/JSON/Tally converter for Indian accountants.',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'INR', name: 'Free' },
      { '@type': 'Offer', price: '299', priceCurrency: 'INR', name: 'Pro Monthly' },
      { '@type': 'Offer', price: '1499', priceCurrency: 'INR', name: 'Firm Monthly' },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '142',
    },
  }
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
