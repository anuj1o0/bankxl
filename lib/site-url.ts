/**
 * lib/site-url.ts — single source of truth for the public site URL.
 *
 * Defensively corrects two recurring misconfigurations of NEXT_PUBLIC_APP_URL:
 *   1. http:// instead of https:// (downgrades break Google indexing)
 *   2. The 'bankxlai.com' typo of our actual domain 'banlxlai.com'
 *
 * Used by sitemap.ts and robots.ts so a stale env var in Vercel can't ship
 * a broken sitemap to Google.
 */

export const CANONICAL_HOST = 'banlxlai.com'
export const CANONICAL_BASE = `https://${CANONICAL_HOST}`

const KNOWN_TYPOS = new Set(['bankxlai.com', 'www.bankxlai.com'])

export function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || CANONICAL_BASE).trim()
  // Strip protocol + trailing slash so we control the scheme
  const hostOnly = raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
  // Replace the recurring typo with the real host
  const host = KNOWN_TYPOS.has(hostOnly) ? CANONICAL_HOST : hostOnly
  return `https://${host}`
}
