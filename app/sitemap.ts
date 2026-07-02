import type { MetadataRoute } from 'next'
import { ALL_BANK_SLUGS } from './banks/[bank]/data'
import { ALL_CONVERT_SLUGS } from './convert/[format]/data'
import { ALL_PERSONA_SLUGS } from './for/[persona]/data'
import { ALL_COMPARE_SLUGS } from './compare/[slug]/data'
import { ALL_BLOG_SLUGS } from './blog/[slug]/data'
import { ALL_USE_CASE_SLUGS } from './use-cases/[slug]/data'
import { resolveSiteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl()
  const now = new Date()

  const staticPages = [
    { path: '',             priority: 1.0, changeFrequency: 'weekly'  as const },
    { path: '/pricing',     priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/banks',       priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/blog',        priority: 0.85, changeFrequency: 'weekly'  as const },
    { path: '/sample',      priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/api-docs',    priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/about',       priority: 0.6, changeFrequency: 'yearly'  as const },
    { path: '/contact',     priority: 0.6, changeFrequency: 'yearly'  as const },
    { path: '/login',       priority: 0.5, changeFrequency: 'yearly'  as const },
    { path: '/privacy',     priority: 0.4, changeFrequency: 'yearly'  as const },
    { path: '/terms',       priority: 0.4, changeFrequency: 'yearly'  as const },
    { path: '/refund',      priority: 0.4, changeFrequency: 'yearly'  as const },
  ]

  // Format-specific converter landing pages — 3,740 combined monthly searches
  const convertPages = ALL_CONVERT_SLUGS.map(slug => ({
    path: `/convert/${slug}`,
    priority: 0.9,
    changeFrequency: 'monthly' as const,
  }))

  // Persona/industry pages
  const personaPages = ALL_PERSONA_SLUGS.map(slug => ({
    path: `/for/${slug}`,
    priority: 0.85,
    changeFrequency: 'monthly' as const,
  }))

  // Comparison pages (bottom-funnel intent)
  const comparePages = ALL_COMPARE_SLUGS.map(slug => ({
    path: `/compare/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }))

  // Blog posts
  const blogPages = ALL_BLOG_SLUGS.map(slug => ({
    path: `/blog/${slug}`,
    priority: 0.75,
    changeFrequency: 'monthly' as const,
  }))

  // Individual bank landing pages — high SEO value, low competition
  const bankPages = ALL_BANK_SLUGS.map(slug => ({
    path: `/banks/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }))

  // Use-case pages (task-oriented intent)
  const useCasePages = ALL_USE_CASE_SLUGS.map(slug => ({
    path: `/use-cases/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }))

  return [
    ...staticPages, ...convertPages, ...personaPages,
    ...comparePages, ...blogPages, ...bankPages, ...useCasePages,
  ].map(p => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
