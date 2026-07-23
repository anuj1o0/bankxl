'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import TopBar from '@/components/dashboard/TopBar'

const Code = ({ children }: { children: string }) => (
  <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text-dim)', overflow: 'auto', lineHeight: 1.7 }}>{children}</pre>
)

export default function ApiPage() {
  const { profile, isFirm, refresh } = useDashboard()
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [tab, setTab] = useState<'curl' | 'python' | 'node'>('curl')

  if (!isFirm) {
    return (
      <>
        <TopBar title="API Access" subtitle="Firm feature" />
        <div style={{ padding: 28, maxWidth: 720 }}>
          <div style={{ padding: 48, textAlign: 'center', background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-bg))', border: '1px solid var(--accent-border)', borderRadius: 16 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔌</div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>API access is a Firm feature</h2>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24, maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.7 }}>
              Plug BankXL directly into your firm's accounting workflow. Convert PDFs to JSON, Excel, CSV or Tally XML programmatically — no UI needed.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/pricing" style={{ padding: '12px 24px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Upgrade to Firm — ₹1,499/mo
              </Link>
              <Link href="/api-docs" style={{ padding: '12px 24px', background: 'var(--hover)', color: 'var(--text)', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none', border: '1px solid var(--border-strong)' }}>
                View docs
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const apiKey = profile?.api_key || ''

  const copy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const regenerate = async () => {
    if (!confirm('Regenerate API key? Old key will stop working immediately.')) return
    setRegenerating(true)
    const res = await fetch('/api/profile?action=regenerate_api_key', { method: 'POST' })
    setRegenerating(false)
    if (res.ok) {
      await refresh()
      setShowKey(true)
    } else {
      const data = await res.json()
      alert(data.error || 'Could not regenerate key.')
    }
  }

  const examples: Record<string, string> = {
    curl: `curl -X POST "https://www.banlxlai.com/api/v1/convert?format=json" \\
  -H "Authorization: Bearer ${showKey ? apiKey : 'YOUR_API_KEY'}" \\
  -F "pdf=@statement.pdf"`,
    python: `import requests

with open("statement.pdf", "rb") as f:
    r = requests.post(
        "https://www.banlxlai.com/api/v1/convert?format=json",
        headers={"Authorization": "Bearer ${showKey ? apiKey : 'YOUR_API_KEY'}"},
        files={"pdf": f}
    )
data = r.json()
print(f"Found {len(data['transactions'])} transactions")
print(f"Bank: {data['meta']['bank_name']}")`,
    node: `import fs from 'node:fs'

const file = fs.readFileSync('statement.pdf')
const r = await fetch('https://www.banlxlai.com/api/v1/convert?format=json', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${showKey ? apiKey : 'YOUR_API_KEY'}',
    'Content-Type': 'application/pdf',
  },
  body: file,
})
const data = await r.json()
console.log(\`\${data.transactions.length} transactions extracted\`)`,
  }

  return (
    <>
      <TopBar title="API Access" subtitle="Programmatically convert bank statements" cta={{ label: 'Full docs →', href: '/api-docs' }} />
      <div style={{ padding: 28, maxWidth: 880 }}>

        {/* API key */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Your API key</h2>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Use this in the Authorization header. Don't commit to git.</p>
            </div>
            <button onClick={regenerate} disabled={regenerating}
              style={{ padding: '8px 14px', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', borderRadius: 8, fontSize: 12, cursor: regenerating ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: 280, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--accent)', letterSpacing: '0.05em', overflowX: 'auto' }}>
              {showKey ? apiKey : '•'.repeat(40)}
            </code>
            <button onClick={() => setShowKey(!showKey)}
              style={{ padding: '11px 14px', background: 'var(--border)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={copy}
              style={{ padding: '11px 14px', background: 'var(--accent-bg-strong)', border: '1px solid var(--accent-border)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'Sora,sans-serif' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Examples */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Quick start</h2>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>POST a PDF, get back JSON with all extracted transactions.</p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {(['curl', 'python', 'node'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '7px 14px', background: tab === t ? 'var(--accent-bg-strong)' : 'transparent',
                  border: `1px solid ${tab === t ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 6, color: tab === t ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                {t}
              </button>
            ))}
          </div>
          <Code>{examples[tab]}</Code>
        </div>

        {/* Endpoints */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Endpoints</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-accent)', background: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontFamily: 'DM Mono, monospace' }}>POST</span>
            <code style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text)', flex: 1 }}>/api/v1/convert</code>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>?format=json|excel|csv|tally</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Need GET, batch, webhooks? <Link href="/contact" style={{ color: 'var(--accent)' }}>Talk to us</Link>.
          </p>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>
          Need help? <Link href="/api-docs" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Read the full docs</Link> or email <a href="mailto:support@banlxlai.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@banlxlai.com</a>
        </div>
      </div>
    </>
  )
}
