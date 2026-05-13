'use client'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'bxl-theme'

interface Ctx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}
const ThemeContext = createContext<Ctx | null>(null)

// This script runs BEFORE React hydrates so the page never flashes the wrong theme.
// Inserted in <head> via dangerouslySetInnerHTML in app/layout.tsx.
export const NO_FLASH_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('bxl-theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch(_) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    let stored: Theme = 'light'
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'light' || v === 'dark') stored = v
    } catch {}
    setThemeState(stored)
    document.documentElement.setAttribute('data-theme', stored)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

interface ToggleProps {
  size?: number
  compact?: boolean
}
export function ThemeToggle({ size = 36, compact = false }: ToggleProps) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  if (compact) {
    return (
      <button onClick={toggle} aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        style={{
          width: size, height: size, borderRadius: 8, cursor: 'pointer',
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}>
        {isDark ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    )
  }

  // Pill toggle (sun / moon)
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      padding: 2,
      gap: 0,
    }}>
      <button onClick={() => !isDark || toggle()} aria-label="Light theme" aria-pressed={!isDark}
        style={{
          width: 30, height: 26, borderRadius: 999, cursor: 'pointer',
          background: !isDark ? 'var(--surface-elev)' : 'transparent',
          border: 'none', color: !isDark ? 'var(--accent)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: !isDark ? 'var(--shadow-sm)' : 'none',
          transition: 'all 0.15s',
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </button>
      <button onClick={() => isDark || toggle()} aria-label="Dark theme" aria-pressed={isDark}
        style={{
          width: 30, height: 26, borderRadius: 999, cursor: 'pointer',
          background: isDark ? 'var(--surface-elev)' : 'transparent',
          border: 'none', color: isDark ? 'var(--accent)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDark ? 'var(--shadow-sm)' : 'none',
          transition: 'all 0.15s',
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  )
}
