'use client'
import { useState } from 'react'
import { useRazorpay, CheckoutResponse } from '@/components/useRazorpay'
import { useToast } from '@/components/Toast'
import { useDashboard } from './DashboardContext'

interface Props {
  variant?: 'primary' | 'secondary' | 'inline'
  label?: string
  onSuccess?: () => void
}

export default function TopupButton({ variant = 'primary', label, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const { openCheckout, verifyPayment } = useRazorpay()
  const toast = useToast()
  const { refresh } = useDashboard()

  const buy = async () => {
    setLoading(true)
    let data: CheckoutResponse
    try {
      const res = await fetch('/api/razorpay/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      data = await res.json()
      if (!res.ok) {
        toast.error('Could not start checkout', (data as any).error || 'Try again.')
        setLoading(false)
        return
      }
    } catch {
      toast.error('Network error', 'Check your connection.'); setLoading(false); return
    }

    try {
      await openCheckout(data, {
        onSuccess: async (success) => {
          // Verify with backend — credits the bonus pages immediately
          // even if webhook isn't reachable
          try {
            const result = await verifyPayment(success)
            if (result?.action === 'topup') {
              toast.success('60 pages added', `Your bonus pages are ready to use.`)
            } else {
              toast.success('Payment received', 'Your account will update shortly.')
            }
          } catch {
            toast.success('Payment received', 'Your account will update shortly.')
          }
          await refresh()
          onSuccess?.()
          setLoading(false)
        },
        onDismiss: () => setLoading(false),
        onFailure: (err) => { toast.error('Payment failed', err); setLoading(false) },
      })
    } catch (e: any) {
      toast.error('Could not open payment', e.message); setLoading(false)
    }
  }

  const labelText = label || 'Buy 60 pages — ₹100'

  if (variant === 'inline') {
    return (
      <button onClick={buy} disabled={loading}
        style={{ background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', cursor: loading ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 500, padding: 0 }}>
        {loading ? 'Opening checkout...' : labelText}
      </button>
    )
  }

  if (variant === 'secondary') {
    return (
      <button onClick={buy} disabled={loading}
        style={{ padding: '10px 18px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
        ⚡ {loading ? 'Opening checkout...' : labelText}
      </button>
    )
  }

  return (
    <button onClick={buy} disabled={loading}
      style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif', boxShadow: 'var(--shadow-glow)' }}>
      ⚡ {loading ? 'Opening checkout...' : labelText}
    </button>
  )
}
