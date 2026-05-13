'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Logo from '@/components/Logo'

type Mode = 'login' | 'signup' | 'forgot'

function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('signup') === 'true') setMode('signup')
    const err = params.get('error')
    if (err === 'auth_failed') setError('Authentication failed. Please try again.')
    if (err === 'profile_missing') setError('Your account data was reset. Please sign in again or create a new account.')
  }, [params])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const sb = createClient()

    if (mode === 'signup') {
      const { error: err } = await sb.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('Check your inbox to verify your email, then sign in.')
    } else if (mode === 'login') {
      const { error: err } = await sb.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push(params.get('redirect') || '/dashboard')
    } else if (mode === 'forgot') {
      const { error: err } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      })
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('Password reset link sent. Check your inbox.')
    }
    setLoading(false)
  }

  const google = async () => {
    setOauthLoading(true); setError('')
    const sb = createClient()
    const redirect = params.get('redirect') || '/dashboard'
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    })
  }

  const titles: Record<Mode, [string, string]> = {
    login: ['Welcome back', 'Sign in to your BankXL account'],
    signup: ['Create your account', '3 free conversions every month'],
    forgot: ['Reset your password', "We'll email you a reset link"],
  }
  const [title, sub] = titles[mode]

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size={20} />
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 20, marginBottom: 6 }}>{title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{sub}</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 16, padding: 28 }}>
          {mode !== 'forgot' && (
            <>
              <button onClick={google} disabled={oauthLoading}
                style={{ width: '100%', padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 13, cursor: oauthLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                {oauthLoading ? 'Redirecting...' : 'Continue with Google'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            </>
          )}

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your name"
                  style={{ width: '100%', padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none', marginTop: 6 }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" autoComplete="email"
                style={{ width: '100%', padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none', marginTop: 6 }} />
            </div>
            {mode !== 'forgot' && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
                      Forgot?
                    </button>
                  )}
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="min 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ width: '100%', padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none', marginTop: 6 }} />
              </div>
            )}
            {error && <div style={{ marginBottom: 14, padding: '11px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>{error}</div>}
            {success && <div style={{ marginBottom: 14, padding: '11px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, fontSize: 13, color: 'var(--accent)' }}>{success}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 12, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 10, fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginTop: 18 }}>
            {mode === 'signup' && (<>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Sora,sans-serif', fontSize: 13 }}>Sign in</button></>)}
            {mode === 'login' && (<>No account? <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Sora,sans-serif', fontSize: 13 }}>Sign up free</button></>)}
            {mode === 'forgot' && (<button type="button" onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Sora,sans-serif', fontSize: 13 }}>← Back to sign in</button>)}
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 18, lineHeight: 1.6 }}>
          By continuing, you agree to our <Link href="/terms" style={{ color: 'var(--text-dim)' }}>Terms</Link> & <Link href="/privacy" style={{ color: 'var(--text-dim)' }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
