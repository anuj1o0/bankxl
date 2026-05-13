'use client'
import { createContext, useCallback, useContext, useState, ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: string
  kind: ToastKind
  title: string
  body?: string
  duration?: number
}

interface Ctx {
  show: (t: Omit<Toast, 'id'>) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
  info: (title: string, body?: string) => void
}

const ToastContext = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const toast: Toast = { id, duration: 4000, ...t }
    setToasts(prev => [toast, ...prev].slice(0, 4))
    setTimeout(() => dismiss(id), toast.duration)
  }, [dismiss])

  const success = useCallback((title: string, body?: string) => show({ kind: 'success', title, body }), [show])
  const error = useCallback((title: string, body?: string) => show({ kind: 'error', title, body, duration: 6000 }), [show])
  const info = useCallback((title: string, body?: string) => show({ kind: 'info', title, body }), [show])

  const colors: Record<ToastKind, { bg: string; border: string; iconColor: string; icon: any }> = {
    success: {
      bg: 'var(--accent-bg)', border: 'var(--accent-border)', iconColor: 'var(--accent)',
      icon: <polyline points="20 6 9 17 4 12" />,
    },
    error: {
      bg: 'var(--error-bg)', border: 'var(--error-border)', iconColor: 'var(--error)',
      icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    },
    info: {
      bg: 'var(--info-bg)', border: 'var(--info-border)', iconColor: 'var(--info)',
      icon: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
    },
  }

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = colors[t.kind]
          return (
            <div key={t.id} onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: 'auto',
                background: 'var(--backdrop-strong)',
                border: `1px solid ${c.border}`,
                borderRadius: 11, padding: '12px 14px',
                minWidth: 280, maxWidth: 380,
                display: 'flex', gap: 10, alignItems: 'flex-start',
                cursor: 'pointer',
                animation: 'bxl-toast-slide 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(12px)',
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: c.bg, color: c.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{t.title}</div>
                {t.body && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.5 }}>{t.body}</div>}
              </div>
              <button aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); dismiss(t.id) }}
                style={{ width: 18, height: 18, borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          )
        })}
      </div>
      <style jsx global>{`
        @keyframes bxl-toast-slide {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
