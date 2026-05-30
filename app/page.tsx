'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Converter from '@/components/Converter'
import AnimatedNumber from '@/components/AnimatedNumber'

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Kotak', 'Yes Bank', 'Canara', 'BoB', 'IDFC First', 'IndusInd', 'Federal', 'Union', 'RBL', 'IDBI', 'AU SFB', 'Chase', 'Bank of America', 'Barclays', 'HSBC', 'ANZ']

const STEPS = [
  { n: '01', label: 'Upload PDF', sub: 'Drop any bank statement — even password-protected ones (after unlock).', icon: '⬆' },
  { n: '02', label: 'AI extracts every row', sub: 'Detects bank, account, period & every single transaction in seconds.', icon: '◇' },
  { n: '03', label: 'Download formatted file', sub: 'Choose Excel, CSV, JSON or Tally XML. Color-coded, filtered, ready to use.', icon: '↓' },
]

const FEATURES = [
  { icon: '🏦', title: 'Every Indian bank', desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, BoB, IDFC, IndusInd & 90+ more. International banks too.' },
  { icon: '🤖', title: 'AI reads scanned PDFs', desc: 'Image-based statements? No problem. Our AI reads at 300 DPI with near-perfect accuracy.' },
  { icon: '📊', title: '4 output formats', desc: 'Excel, CSV, JSON & Tally Prime XML. Drop straight into Tally, Zoho, Vyapar or any tool.' },
  { icon: '🔒', title: 'Zero data retention', desc: 'Files processed in memory. Nothing stored on disk. Deleted instantly after conversion.' },
  { icon: '⚡', title: '15-second conversions', desc: 'Most statements done in under 15 seconds, even multi-page ones with 500+ transactions.' },
  { icon: '🎯', title: 'CA-grade Excel', desc: 'Color-coded debits/credits, summary sheet, by-type breakdown, frozen headers, auto-filter.' },
  { icon: '🔌', title: 'Page-based pricing', desc: 'Pay only for what you actually use. Free tier gets 50 pages every month, no card required.' },
  { icon: '👥', title: 'Team-ready', desc: 'Invite your articles or partners. Shared usage, shared history, single subscription.' },
]

const TESTIMONIALS = [
  { name: 'Rajesh Agarwal', role: 'Chartered Accountant, Delhi', text: 'I used to spend 2 hours re-typing every client\'s SBI and HDFC statements. BankXL does it in 20 seconds. Honestly the best ₹299 I spend each month.', rating: 5 },
  { name: 'Priya Sharma', role: 'Senior Accountant, Mumbai', text: 'The Tally XML export is a game-changer for me. I import directly without any cleanup. Saved my team 12+ hours a week.', rating: 5 },
  { name: 'Amit Verma', role: 'Partner, CA Firm Pune', text: 'We process 200+ statements a month across our team. The Firm plan saved us from building this in-house. ROI was instant.', rating: 5 },
  { name: 'Neha Patel', role: 'Freelance Bookkeeper, Ahmedabad', text: 'Even works with my client\'s scanned PDFs from old SBI passbooks. Crazy accurate. The day-pass option is perfect for one-off jobs.', rating: 5 },
]

const FAQ = [
  { q: 'Which banks does BankXL support?', a: 'All Indian banks — SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, BoB, IDFC, IndusInd, Federal, Yes, RBL, IDBI, Union, AU SFB and 90+ more. International banks (DBS, Citi, HSBC, Standard Chartered, etc.) are also supported.' },
  { q: 'How accurate is the conversion?', a: 'For digitally-generated PDFs, accuracy is typically 99.5%+. For scanned/image PDFs, 95%+ depending on quality. Always review the Excel before final use — that\'s standard practice for any conversion tool.' },
  { q: 'Is my data safe?', a: 'Yes. Files are processed in memory and never stored on our servers. Nothing is written to disk. We don\'t train AI models on your data, and we don\'t share data with third parties.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your dashboard with one click. You keep access until the end of your billing period. No questions asked.' },
  { q: 'Do you offer a free trial?', a: 'Yes. The free plan gives you 50 pages every month, no credit card needed. If you need a one-off, grab a ₹49 day pass for 100 pages in 24 hours.' },
  { q: 'Does it work on password-protected PDFs?', a: 'Remove the password first using any free PDF unlocker (or Adobe Acrobat). Once unlocked, BankXL handles the rest.' },
  { q: 'Can I get a custom invoice for tax purposes?', a: 'Yes. Indian users get GST-compliant invoices via Razorpay. International users get receipts via Lemon Squeezy. Email support@bankxlai.com if you need anything custom.' },
]

const COMPARISON = [
  { feat: 'All Indian banks', us: true, others: 'Limited' },
  { feat: 'Scanned PDFs (OCR)', us: true, others: 'Often broken' },
  { feat: 'Excel + CSV + JSON + Tally', us: true, others: 'Excel only' },
  { feat: 'Color-coded output', us: true, others: false },
  { feat: 'Day pass (no subscription)', us: '₹49 / 100 pages', others: false },
  { feat: 'Indian pricing', us: '₹299/mo', others: '$15+ /mo' },
  { feat: 'Pay only for pages used', us: true, others: false },
]

const faqLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const howToLD = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to convert a bank statement PDF to Excel',
  description: 'Convert any bank statement PDF to a formatted Excel file in 3 easy steps using BankXL.',
  totalTime: 'PT1M',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Upload PDF', text: 'Drop your bank statement PDF — even password-protected ones (after unlock).' },
    { '@type': 'HowToStep', position: 2, name: 'AI extracts data', text: 'BankXL AI reads every transaction, amount, date and balance in seconds.' },
    { '@type': 'HowToStep', position: 3, name: 'Download Excel', text: 'Download clean Excel, CSV, JSON or Tally XML — formatted and ready to use.' },
  ],
}

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLD) }} />
      <div className="glow-blob" style={{ top: -200, right: -100 }} />
      <Nav />

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 480px)', gap: 56, alignItems: 'center' }} className="hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: 'var(--accent)', marginBottom: 22, fontFamily: 'DM Mono, monospace' }}>
              <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 8px var(--accent)' }} />
              Trusted by 1,200+ CAs across India
            </div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 18, color: 'var(--text-strong)' }}>
              Bank statement PDF<br />
              to <span style={{ color: 'var(--accent)' }}>Excel in 15 seconds.</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 28, maxWidth: 540 }}>
              Drop any bank statement — printed, scanned or digital. Our AI reads every transaction with surgical precision and gives you a clean Excel, CSV, JSON or Tally file. Works with 500+ banks worldwide.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href="#converter" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
                Convert your first PDF →
              </Link>
              <Link href="/sample" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
                Try with sample PDF
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
              {['50 free pages / month', 'No credit card needed', 'Cancel anytime'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="converter" style={{ position: 'relative' }}>
            <Converter user={user} />
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, padding: '24px 32px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14 }}>
          {[
            { v: 1200, suffix: '+', l: 'CAs onboard' },
            { v: 50000, suffix: '+', l: 'Statements converted' },
            { v: 99.5, suffix: '%', l: 'Accuracy', decimal: 1 },
            { v: 15, suffix: 's', l: 'Avg conversion' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
                <AnimatedNumber end={s.v} format={n => (s.decimal ? n.toFixed(s.decimal) : Math.round(n).toLocaleString('en-IN'))} />
                {s.suffix}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BANK CHIPS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 40px' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, textAlign: 'center', marginBottom: 18 }}>WORKS WITH 500+ BANKS WORLDWIDE</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {BANKS.map(b => (
            <span key={b} className="mono" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'var(--surface-2)' }}>{b}</span>
          ))}
          <Link href="/banks" className="mono" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, color: 'var(--accent)', textDecoration: 'none' }}>+ 90 more →</Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12, color: 'var(--text-strong)' }}>Three steps. Zero friction.</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>No setup. No training. No learning curve.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
              <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 16, letterSpacing: 2 }}>{s.n}</div>
              <div style={{ width: 44, height: 44, background: 'var(--accent-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20, color: 'var(--accent)' }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>FEATURES</div>
          <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12, color: 'var(--text-strong)' }}>Everything an Indian CA needs</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Built specifically for accountants, finance teams & bookkeepers.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>WHY BANKXL</div>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>How we compare</h2>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>FEATURE</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--accent)', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>BANKXL</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>OTHERS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text)' }}>{c.feat}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13 }}>
                    {c.us === true ? (
                      <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Yes
                      </span>
                    ) : <span style={{ color: 'var(--accent)' }}>{c.us}</span>}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13 }}>
                    {c.others === false ? (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    ) : <span style={{ color: 'var(--text-dim)' }}>{c.others}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>TESTIMONIALS</div>
          <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>Loved by accountants across India</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#FFB800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>"{t.text}"</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>Frequently asked</h2>
        </div>
        {FAQ.map((faq, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', padding: '18px 0', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 15, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
              {faq.q}
              <span style={{ color: openFaq === i ? 'var(--accent)' : 'var(--text-muted)', fontSize: 22, flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
            </button>
            {openFaq === i && <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, paddingBottom: 18, marginTop: -4 }}>{faq.a}</p>}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 16, color: 'var(--text-strong)' }}>Stop typing, start clicking.</h2>
        <p style={{ fontSize: 17, color: 'var(--text-dim)', marginBottom: 32, lineHeight: 1.6 }}>50 free pages every month. No credit card. No commitment. Cancel anytime if you upgrade.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login?signup=true" style={{ background: 'var(--accent)', color: 'var(--on-accent)', padding: '16px 32px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none', boxShadow: 'var(--shadow-glow)' }}>
            Create free account →
          </Link>
          <Link href="/pricing" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '16px 32px', borderRadius: 12, fontWeight: 500, fontSize: 15, textDecoration: 'none' }}>
            See pricing
          </Link>
        </div>
      </section>

      <Footer />
      <style jsx>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
