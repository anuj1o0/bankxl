'use client'
import { useEffect, useState, useCallback } from 'react'

declare global {
  interface Window {
    Razorpay: any
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptLoadedPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'))
  if (window.Razorpay) return Promise.resolve()
  if (scriptLoadedPromise) return scriptLoadedPromise

  scriptLoadedPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadedPromise = null
      reject(new Error('Could not load Razorpay checkout. Check your internet connection.'))
    }
    document.body.appendChild(script)
  })
  return scriptLoadedPromise
}

export interface CheckoutResponse {
  type: 'subscription' | 'order'
  subscriptionId?: string
  orderId?: string
  amount?: number
  keyId: string
  name: string
  description: string
  prefillEmail?: string
}

export interface PaymentSuccess {
  paymentId: string
  subscriptionId?: string  // present for subscription payments
  orderId?: string         // present for one-time orders
  signature: string
}

export interface OpenCheckoutOptions {
  /** Called after successful payment. Receives all relevant IDs for verification. */
  onSuccess?: (success: PaymentSuccess) => void
  onDismiss?: () => void
  onFailure?: (errorDescription: string) => void
  themeColor?: string
}

export function useRazorpay() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadScript()
      .then(() => setReady(true))
      .catch(() => setReady(false))
  }, [])

  const openCheckout = useCallback(
    async (data: CheckoutResponse, opts: OpenCheckoutOptions = {}) => {
      await loadScript()
      const W = window as any
      if (!W.Razorpay) throw new Error('Razorpay failed to load')

      const options: any = {
        key: data.keyId,
        name: data.name,
        description: data.description,
        theme: { color: opts.themeColor || '#00a86b' },
        prefill: { email: data.prefillEmail || '' },
        modal: {
          ondismiss: () => opts.onDismiss?.(),
          escape: true,
          backdropclose: false,
        },
        handler: function (response: any) {
          opts.onSuccess?.({
            paymentId: response.razorpay_payment_id,
            subscriptionId: response.razorpay_subscription_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          })
        },
      }

      if (data.type === 'subscription') {
        options.subscription_id = data.subscriptionId
      } else {
        options.order_id = data.orderId
        options.amount = data.amount
        options.currency = 'INR'
      }

      const rzp = new W.Razorpay(options)
      rzp.on('payment.failed', (response: any) => {
        opts.onFailure?.(response?.error?.description || 'Payment failed')
      })
      rzp.open()
    },
    []
  )

  /** Helper: verify a Razorpay payment server-side after success.
   *  Replaces the webhook for environments where it's not reachable. */
  const verifyPayment = useCallback(async (success: PaymentSuccess) => {
    const res = await fetch('/api/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: success.paymentId,
        subscriptionId: success.subscriptionId,
        orderId: success.orderId,
      }),
    })
    return res.json()
  }, [])

  return { ready, openCheckout, verifyPayment }
}
