'use client'
import { track as vercelTrack } from '@vercel/analytics'

/**
 * Funnel event tracking via Vercel Analytics (already installed, no new
 * account/env var needed — visible under Vercel dashboard → Analytics →
 * Events). Wrapped so call sites don't need try/catch: analytics must never
 * be able to break the actual conversion/checkout flow it's observing.
 */
export function track(name: string, properties?: Record<string, string | number | boolean | null>) {
  try {
    vercelTrack(name, properties)
  } catch {
    // never let analytics failures affect the user-facing flow
  }
}
