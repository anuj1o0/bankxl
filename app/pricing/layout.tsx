import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — BankXL Bank Statement Converter',
  description: 'Simple page-based pricing. Free 50 pages/month. Pro ₹499/mo (800 pages). Firm ₹4,999/mo (8,000 pages + team). Day Pass ₹49. No hidden fees. Pay via UPI, card, netbanking.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'BankXL Pricing — Pay Only for Pages You Convert',
    description: 'Free plan available. Pro from ₹499/mo. Firm from ₹4,999/mo. Day Pass ₹49. All Indian banks supported.',
    url: '/pricing',
    images: [{ url: '/api/og?title=Simple%2C%20honest%20pricing&sub=Free+50+pages+%2F+month+%E2%80%94+no+card+needed', width: 1200, height: 630 }],
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
