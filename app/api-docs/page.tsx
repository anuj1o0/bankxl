import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'API Documentation',
  description: 'Convert bank statement PDFs to structured JSON, Excel, CSV or Tally XML using the BankXL REST API.',
}

const Code = ({ children }: { children: string }) => (
  <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, fontSize: 13, fontFamily: 'DM Mono, monospace', color: 'var(--text-dim)', overflow: 'auto', lineHeight: 1.7 }}>{children}</pre>
)

const H = ({ children, id }: { children: any; id?: string }) => (
  <h2 id={id} style={{ fontSize: 22, fontWeight: 600, marginTop: 48, marginBottom: 14, letterSpacing: '-0.01em' }}>{children}</h2>
)
const H3 = ({ children }: { children: any }) => (
  <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>{children}</h3>
)
const P = ({ children }: { children: any }) => (
  <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 12 }}>{children}</p>
)

export default function ApiDocsPage() {
  return (
    <div className="grid-bg" style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 42px)', fontWeight: 600, letterSpacing: '-0.03em', marginTop: 16, marginBottom: 14 }}>
          BankXL API
        </h1>
        <P>
          A simple REST API to convert bank statement PDFs into structured data. Available on the <Link href="/pricing" style={{ color: 'var(--accent)' }}>Firm plan</Link>.
        </P>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, marginBottom: 24 }}>
          {['Authentication', 'Endpoints', 'Response', 'Errors', 'Rate limits'].map(s => (
            <a key={s} href={`#${s.toLowerCase().replace(' ', '-')}`} className="mono" style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-dim)', textDecoration: 'none' }}>{s}</a>
          ))}
        </div>

        <H id="authentication">Authentication</H>
        <P>
          All API requests require an API key. Find yours in your <Link href="/dashboard" style={{ color: 'var(--accent)' }}>dashboard</Link> after upgrading to Firm.
        </P>
        <P>Pass it as a Bearer token:</P>
        <Code>{`Authorization: Bearer bxl_a1b2c3d4...`}</Code>
        <P>Or as an x-api-key header:</P>
        <Code>{`x-api-key: bxl_a1b2c3d4...`}</Code>

        <H id="endpoints">Endpoints</H>
        <H3>POST /api/v1/convert</H3>
        <P>Convert a bank statement PDF to structured data.</P>

        <H3>Query parameters</H3>
        <Code>{`format    json | excel | csv | tally    (default: json)`}</Code>

        <H3>Request body</H3>
        <P>Two ways to send a PDF:</P>
        <P><strong>1. multipart/form-data</strong> with field name <code style={{ color: 'var(--accent)' }}>pdf</code>:</P>
        <Code>{`curl -X POST "https://www.banlxlai.com/api/v1/convert?format=json" \\
  -H "Authorization: Bearer bxl_YOUR_KEY" \\
  -F "pdf=@statement.pdf"`}</Code>

        <P><strong>2. Raw PDF</strong> as request body:</P>
        <Code>{`curl -X POST "https://www.banlxlai.com/api/v1/convert?format=excel" \\
  -H "Authorization: Bearer bxl_YOUR_KEY" \\
  -H "Content-Type: application/pdf" \\
  --data-binary @statement.pdf \\
  -o statement.xlsx`}</Code>

        <H id="response">Response (format=json)</H>
        <Code>{`{
  "meta": {
    "bank_name": "HDFC Bank",
    "account_holder": "John Doe",
    "account_no": "50100123456789",
    "ifsc": "HDFC0001234",
    "period_from": "2025-04-01",
    "period_to": "2025-04-30",
    "opening_balance": 12500.00,
    "closing_balance": 18750.50,
    "currency": "INR"
  },
  "transactions": [
    {
      "date": "2025-04-03",
      "description": "UPI/CRED CLUB/Payment",
      "debit": 2500.00,
      "credit": null,
      "balance": 10000.00,
      "ref_no": "UPI/123456789012"
    }
    // ...
  ],
  "processing_time_ms": 13420
}`}</Code>

        <H3>SDK examples</H3>
        <P><strong>Python (requests)</strong>:</P>
        <Code>{`import requests

with open("statement.pdf", "rb") as f:
    r = requests.post(
        "https://www.banlxlai.com/api/v1/convert?format=json",
        headers={"Authorization": "Bearer bxl_YOUR_KEY"},
        files={"pdf": f}
    )
data = r.json()
print(f"Found {len(data['transactions'])} transactions")`}</Code>

        <P><strong>Node.js (fetch)</strong>:</P>
        <Code>{`import fs from 'node:fs'

const file = fs.readFileSync('statement.pdf')
const r = await fetch('https://www.banlxlai.com/api/v1/convert?format=json', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer bxl_YOUR_KEY',
    'Content-Type': 'application/pdf',
  },
  body: file,
})
const data = await r.json()
console.log(\`\${data.transactions.length} transactions extracted\`)`}</Code>

        <H id="errors">Errors</H>
        <Code>{`401  Missing or invalid API key
403  Account is not on Firm plan
400  Invalid PDF or missing file
422  No transactions detected (not a bank statement?)
429  Rate limited
500  Extraction failed (will return error message)`}</Code>

        <H id="rate-limits">Rate limits</H>
        <P>
          Firm plan: <strong>10 requests / minute</strong>. Need more? Email support@banlxlai.com to upgrade.
        </P>

        <div style={{ marginTop: 56, padding: 28, background: 'linear-gradient(135deg, var(--accent-bg), var(--info-bg))', border: '1px solid var(--accent-border)', borderRadius: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Get your API key</h3>
          <P>Upgrade to the Firm plan and your API key appears in the dashboard immediately.</P>
          <Link href="/pricing" style={{ display: 'inline-block', background: 'var(--accent)', color: 'var(--on-accent)', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            See pricing →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
