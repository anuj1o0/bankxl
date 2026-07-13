import type { MetadataRoute } from 'next'
import { ALL_BANK_SLUGS, BANK_PAGES } from './banks/[bank]/data'
import { ALL_CONVERT_SLUGS } from './convert/[format]/data'
import { ALL_PERSONA_SLUGS } from './for/[persona]/data'
import { ALL_COMPARE_SLUGS } from './compare/[slug]/data'
import { ALL_BLOG_SLUGS } from './blog/[slug]/data'
import { ALL_USE_CASE_SLUGS } from './use-cases/[slug]/data'
import { resolveSiteUrl } from '@/lib/site-url'

// Real content dates (from git history) instead of `new Date()` on every
// build — a sitemap where all 80+ URLs share one identical, ever-changing
// timestamp reads as synthetic and Google discounts it. Using the actual
// last-touched date lets fresh pages (e.g. the US bank pages) stand out
// from stable ones instead of burying that signal.
const SITE_STABLE_DATE = '2026-07-08'   // last broad content/cross-link pass before this batch
const US_EXPANSION_DATE = '2026-07-13'  // US banks + us-accountants persona added

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl()

  const staticPages = [
    { path: '',             priority: 1.0, changeFrequency: 'weekly'  as const, lastModified: US_EXPANSION_DATE },
    { path: '/pricing',     priority: 0.9, changeFrequency: 'monthly' as const, lastModified: US_EXPANSION_DATE },
    { path: '/banks',       priority: 0.85, changeFrequency: 'monthly' as const, lastModified: US_EXPANSION_DATE },
    { path: '/blog',        priority: 0.85, changeFrequency: 'weekly'  as const, lastModified: SITE_STABLE_DATE },
    { path: '/sample',      priority: 0.7, changeFrequency: 'monthly' as const, lastModified: SITE_STABLE_DATE },
    { path: '/api-docs',    priority: 0.7, changeFrequency: 'monthly' as const, lastModified: SITE_STABLE_DATE },
    { path: '/about',       priority: 0.6, changeFrequency: 'yearly'  as const, lastModified: SITE_STABLE_DATE },
    { path: '/contact',     priority: 0.6, changeFrequency: 'yearly'  as const, lastModified: SITE_STABLE_DATE },
    { path: '/privacy',     priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: SITE_STABLE_DATE },
    { path: '/terms',       priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: SITE_STABLE_DATE },
    { path: '/refund',      priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: SITE_STABLE_DATE },
    // '/login' intentionally excluded — auth page, no unique content to index.
  ]

  // Format-specific converter landing pages — 3,740 combined monthly searches
  const convertPages = ALL_CONVERT_SLUGS.map(slug => ({
    path: `/convert/${slug}`,
    priority: 0.9,
    changeFrequency: 'monthly' as const,
    lastModified: SITE_STABLE_DATE,
  }))

  // Persona/industry pages
  const personaPages = ALL_PERSONA_SLUGS.map(slug => ({
    path: `/for/${slug}`,
    priority: 0.85,
    changeFrequency: 'monthly' as const,
    lastModified: slug === 'us-accountants' ? US_EXPANSION_DATE : SITE_STABLE_DATE,
  }))

  // Comparison pages (bottom-funnel intent)
  const comparePages = ALL_COMPARE_SLUGS.map(slug => ({
    path: `/compare/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: SITE_STABLE_DATE,
  }))

  // Blog posts
  const blogPages = ALL_BLOG_SLUGS.map(slug => ({
    path: `/blog/${slug}`,
    priority: 0.75,
    changeFrequency: 'monthly' as const,
    lastModified: SITE_STABLE_DATE,
  }))

  // Individual bank landing pages — high SEO value, low competition
  const bankPages = ALL_BANK_SLUGS.map(slug => ({
    path: `/banks/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: BANK_PAGES[slug].country === 'US' ? US_EXPANSION_DATE : SITE_STABLE_DATE,
  }))

  // Use-case pages (task-oriented intent)
  const useCasePages = ALL_USE_CASE_SLUGS.map(slug => ({
    path: `/use-cases/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: SITE_STABLE_DATE,
  }))

  return [
    ...staticPages, ...convertPages, ...personaPages,
    ...comparePages, ...blogPages, ...bankPages, ...useCasePages,
  ].map(p => ({
    url: `${base}${p.path}`,
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
