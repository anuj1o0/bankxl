/**
 * lib/admin.ts — who can see the founder-only admin views.
 *
 * Allow-list of emails from NEXT_PUBLIC_ADMIN_EMAILS (comma-separated). It's a
 * NEXT_PUBLIC var on purpose so the Sidebar (a client component) can decide
 * whether to show the Admin link. That is NOT the security boundary — knowing
 * an admin email grants nothing; you still have to be authenticated AS that
 * account. The real gate is server-side: the /dashboard/admin page re-checks
 * the logged-in user's email here and 404s otherwise.
 */
export function adminEmails(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return adminEmails().includes(email.trim().toLowerCase())
}
