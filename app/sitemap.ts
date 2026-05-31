import type { MetadataRoute } from 'next'
import { ALL_BANK_SLUGS } from './banks/[bank]/data'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://banlxlai.com').replace(/\/$/, '')
  const now = new Date()

  const staticPages = [
    { path: '',             priority: 1.0, changeFrequency: 'weekly'  as const },
    { path: '/pricing',     priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/banks',       priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/sample',      priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/api-docs',    priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/about',       priority: 0.6, changeFrequency: 'yearly'  as const },
    { path: '/contact',     priority: 0.6, changeFrequency: 'yearly'  as const },
    { path: '/login',       priority: 0.5, changeFrequency: 'yearly'  as const },
    { path: '/privacy',     priority: 0.4, changeFrequency: 'yearly'  as const },
    { path: '/terms',       priority: 0.4, changeFrequency: 'yearly'  as const },
    { path: '/refund',      priority: 0.4, changeFrequency: 'yearly'  as const },
  ]

  // Individual bank landing pages — high SEO value
  const bankPages = ALL_BANK_SLUGS.map(slug => ({
    path: `/banks/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }))

  return [...staticPages, ...bankPages].map(p => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
