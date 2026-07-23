/**
 * lib/site-url.ts — single source of truth for the public site URL.
 *
 * Defensively corrects three recurring misconfigurations of NEXT_PUBLIC_APP_URL:
 *   1. http:// instead of https:// (downgrades break Google indexing)
 *   2. The 'bankxlai.com' typo of our actual domain 'banlxlai.com'
 *   3. The bare apex 'banlxlai.com' instead of the canonical 'www.banlxlai.com'
 *
 * The canonical host is WWW: Vercel 301-redirects the apex → www at the edge
 * (see next.config.js), so the live URL every visitor and crawler lands on is
 * www. If our metadata/sitemap/canonical tags pointed at the apex instead,
 * Google would index both hosts separately and split the domain's authority —
 * which is exactly what the GSC data showed. Everything here forces www so the
 * canonical we advertise matches the URL that actually serves 200.
 *
 * Used by sitemap.ts, robots.ts, layout metadata and page canonicals so a stale
 * env var in Vercel can't ship a split-authority signal to Google.
 */

export const CANONICAL_HOST = 'www.banlxlai.com'
export const CANONICAL_BASE = `https://${CANONICAL_HOST}`

const KNOWN_TYPOS = new Set(['bankxlai.com', 'www.bankxlai.com'])
// Bare apex → force to the www canonical (Vercel redirects apex → www).
const APEX_HOSTS = new Set(['banlxlai.com'])

export function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || CANONICAL_BASE).trim()
  // Strip protocol + trailing slash so we control the scheme
  const hostOnly = raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()
  // Replace the recurring typo, then normalise the apex to www.
  let host = KNOWN_TYPOS.has(hostOnly) ? CANONICAL_HOST : hostOnly
  if (APEX_HOSTS.has(host)) host = CANONICAL_HOST
  return `https://${host}`
}
