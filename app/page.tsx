'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Converter from '@/components/Converter'
import AnimatedNumber from '@/components/AnimatedNumber'

const BANKS_ROW_1 = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak', 'PNB', 'Yes Bank', 'Canara Bank', 'Bank of Baroda', 'IDFC First', 'IndusInd']
const BANKS_ROW_2 = ['Federal Bank', 'Union Bank', 'RBL', 'IDBI', 'AU SFB', 'Chase', 'Bank of America', 'Wells Fargo', 'Barclays', 'HSBC', 'Citi', 'ANZ']

const TESTIMONIALS = [
  { name: 'Rajesh Agarwal', role: 'Chartered Accountant, Delhi', text: 'I used to spend 2 hours re-typing every client\'s SBI and HDFC statements. BankXL does it in 20 seconds. Honestly the best money I spend each month.', rating: 5 },
  { name: 'Priya Sharma', role: 'Senior Accountant, Mumbai', text: 'The Tally XML export is a game-changer for me. I import directly without any cleanup. Saved my team 12+ hours a week.', rating: 5 },
  { name: 'Amit Verma', role: 'Partner, CA Firm Pune', text: 'We process 200+ statements a month across our team. The Firm plan saved us from building this in-house. ROI was instant.', rating: 5 },
  { name: 'Neha Patel', role: 'Freelance Bookkeeper, Ahmedabad', text: 'Even works with my client\'s scanned PDFs from old SBI passbooks. Crazy accurate. The day-pass option is perfect for one-off jobs.', rating: 5 },
]

const FAQ = [
  { q: 'Which banks does BankXL support?', a: 'All Indian banks — SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, BoB, IDFC, IndusInd, Federal, Yes, RBL, IDBI, Union, AU SFB and 90+ more. International banks (Chase, Bank of America, Wells Fargo, HSBC, Citi, DBS, Standard Chartered, etc.) are also supported.' },
  { q: 'How accurate is the conversion?', a: 'For digitally-generated PDFs, accuracy is typically 99.5%+. For scanned/image PDFs, 95%+ depending on quality. Always review the Excel before final use — that\'s standard practice for any conversion tool.' },
  { q: 'Is my data safe?', a: 'Yes. Files are processed in memory and never stored on our servers. Nothing is written to disk. We don\'t train AI models on your data, and we don\'t share data with third parties.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your dashboard with one click. You keep access until the end of your billing period. No questions asked.' },
  { q: 'Do you offer a free trial?', a: 'Yes. The free plan gives you 50 pages every month, no credit card needed. If you need a one-off, grab a ₹49 day pass for 100 pages in 24 hours.' },
  { q: 'Does it work on password-protected PDFs?', a: 'Remove the password first using any free PDF unlocker (or Adobe Acrobat). Once unlocked, BankXL handles the rest.' },
  { q: 'Can I get a custom invoice for tax purposes?', a: 'Yes. You get GST-compliant invoices via Razorpay. Email support@banlxlai.com if you need anything custom.' },
]

const COMPARISON = [
  { feat: 'All Indian banks', us: true, others: 'Limited' },
  { feat: 'Scanned PDFs (OCR)', us: true, others: 'Often broken' },
  { feat: 'Excel + CSV + JSON + Tally', us: true, others: 'Excel only' },
  { feat: 'Color-coded output', us: true, others: false },
  { feat: 'Day pass (no subscription)', us: '₹49 / 100 pages', others: false },
  { feat: 'Indian pricing', us: '₹499/mo', others: '$15+ /mo' },
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

/* ─── Inline icon set (stroke style, inherits currentColor) ─────────────── */
const I = {
  upload: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  sparkles: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>,
  download: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  bank: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21v-6h6v6"/><path d="M2 10l10-7 10 7"/></svg>,
  scan: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  grid: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  lock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  zap: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  target: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>,
  coins: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
}

/* ─── Scroll-reveal wrapper ──────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', style }: {
  children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

const FEATURES_BENTO = [
  {
    icon: I.bank, title: 'Every Indian bank — and beyond', big: true,
    desc: 'SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, BoB, IDFC, IndusInd and 90+ more Indian banks. Plus Chase, Bank of America, Wells Fargo, HSBC and 400+ international banks.',
  },
  {
    icon: I.scan, title: 'AI reads scanned PDFs', big: true,
    desc: 'Image-based statements from old passbooks? No problem. Our AI reads scans at near-perfect accuracy — no manual cleanup needed.',
  },
  { icon: I.grid, title: '4 output formats', desc: 'Excel, CSV, JSON & Tally Prime XML. Drop straight into Tally, Zoho or QuickBooks.' },
  { icon: I.lock, title: 'Zero data retention', desc: 'Processed in memory, never written to disk. Deleted instantly after conversion.' },
  { icon: I.zap, title: '15-second conversions', desc: 'Even multi-page statements with 500+ transactions finish in seconds.' },
  { icon: I.target, title: 'CA-grade Excel', desc: 'Color-coded debits/credits, summary sheet, frozen headers, auto-filter.' },
  { icon: I.coins, title: 'Page-based pricing', desc: 'Pay only for what you use. 50 free pages monthly — no card required.' },
  { icon: I.users, title: 'Team-ready', desc: 'Invite your articles or partners. Shared usage, one subscription.' },
]

const STEPS = [
  { n: '01', icon: I.upload, label: 'Upload your PDF', sub: 'Drop any bank statement — digital, printed or scanned. Up to 25 MB.' },
  { n: '02', icon: I.sparkles, label: 'AI extracts every row', sub: 'Detects bank, account, period & every transaction — in seconds, with running balance intact.' },
  { n: '03', icon: I.download, label: 'Download clean output', sub: 'Excel, CSV, JSON or Tally XML. Color-coded, filtered, ready to import.' },
]

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLD) }} />
      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <div className="glow-blob" style={{ top: 380, left: -320, background: 'radial-gradient(circle, var(--accent-2-glow) 0%, transparent 70%)' }} />
      <Nav />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '72px 24px 40px', position: 'relative' }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 480px)', gap: 56, alignItems: 'center' }}>
          <div>
            <div className="anim-fadeup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '6px 16px', fontSize: 12, color: 'var(--accent)', marginBottom: 26, fontFamily: 'DM Mono, monospace' }}>
              <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent)' }} />
              Trusted by 1,200+ accountants
            </div>
            <h1 className="display anim-fadeup" style={{ fontSize: 'clamp(40px, 5.4vw, 64px)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em', marginBottom: 22, color: 'var(--text-strong)', animationDelay: '60ms' }}>
              Bank statements,<br />
              <span className="text-gradient">Excel-ready</span> in
              <span style={{ whiteSpace: 'nowrap' }}> 15 seconds.</span>
            </h1>
            <p className="anim-fadeup" style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 32, maxWidth: 530, animationDelay: '120ms' }}>
              Drop any bank statement — printed, scanned or digital. Our AI reads every
              transaction with surgical precision and hands you a clean Excel, CSV, JSON
              or Tally file. 500+ banks worldwide.
            </p>
            <div className="anim-fadeup" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 34, animationDelay: '180ms' }}>
              <Link href="#converter" className="btn-primary">
                Convert your first PDF
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link href="/sample" className="btn-secondary">Try with sample PDF</Link>
            </div>
            <div className="anim-fadeup" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-muted)', animationDelay: '240ms' }}>
              {['50 free pages / month', 'No credit card needed', 'Cancel anytime'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{I.check}</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Converter framed with floating format chips */}
          <div id="converter" style={{ position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', inset: -28, background: 'radial-gradient(ellipse at 50% 40%, var(--accent-glow), transparent 70%)', filter: 'blur(28px)', zIndex: 0, opacity: 0.7 }} />
            {([
              { label: '.XLSX', pos: { top: -16, right: 24 }, rot: '3deg', delay: '0s' },
              { label: '.CSV', pos: { bottom: 64, left: -22 }, rot: '-4deg', delay: '1.2s' },
              { label: 'TALLY XML', pos: { bottom: -14, right: 48 }, rot: '2deg', delay: '2.1s' },
            ] as const).map(c => (
              <span key={c.label} className="mono floaty" aria-hidden style={{
                position: 'absolute', ...c.pos,
                zIndex: 2, fontSize: 11, fontWeight: 500, letterSpacing: 1,
                padding: '7px 13px', borderRadius: 10,
                background: 'var(--surface-elev)', border: '1px solid var(--accent-border)',
                color: 'var(--accent)', boxShadow: 'var(--shadow-md)',
                ['--float-rot' as any]: c.rot, animationDelay: c.delay,
              }}>{c.label}</span>
            ))}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Converter user={user} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ──────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 24px 16px' }}>
        <Reveal>
          <div className="stats-strip card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', borderRadius: 20, overflow: 'hidden' }}>
            {[
              { v: 1200, suffix: '+', l: 'Accountants onboard' },
              { v: 50000, suffix: '+', l: 'Statements converted' },
              { v: 99.5, suffix: '%', l: 'Extraction accuracy', decimal: 1 },
              { v: 15, suffix: 's', l: 'Average conversion' },
            ].map((s, i) => (
              <div key={s.l} style={{ textAlign: 'center', padding: '28px 16px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div className="display" style={{ fontSize: 34, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  <AnimatedNumber end={s.v} format={n => (s.decimal ? n.toFixed(s.decimal) : Math.round(n).toLocaleString('en-IN'))} />
                  <span style={{ color: 'var(--accent)' }}>{s.suffix}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─── BANK MARQUEE ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 0 48px' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2.5, textAlign: 'center', marginBottom: 22 }}>
          WORKS WITH 500+ BANKS WORLDWIDE
        </div>
        <div className="marquee" style={{ marginBottom: 10 }}>
          <div className="marquee-track">
            {[...BANKS_ROW_1, ...BANKS_ROW_1].map((b, i) => (
              <span key={i} className="bank-chip mono">{b}</span>
            ))}
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track" style={{ animationDirection: 'reverse', animationDuration: '44s' }}>
            {[...BANKS_ROW_2, ...BANKS_ROW_2].map((b, i) => (
              <span key={i} className="bank-chip mono">{b}</span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/banks" className="mono" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', letterSpacing: 0.5 }}>
            See all supported banks →
          </Link>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '72px 24px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 14 }}>HOW IT WORKS</div>
            <h2 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12, color: 'var(--text-strong)' }}>
              Three steps. Zero friction.
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>No setup. No training. No learning curve.</p>
          </div>
        </Reveal>
        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, position: 'relative' }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="card card-hover" style={{ padding: 30, position: 'relative', height: '100%' }}>
                <div className="display" aria-hidden style={{ position: 'absolute', top: 18, right: 22, fontSize: 56, fontWeight: 800, color: 'var(--accent-bg-strong)', lineHeight: 1, letterSpacing: '-0.04em', userSelect: 'none' }}>
                  {s.n}
                </div>
                <div style={{ width: 50, height: 50, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: 'var(--accent)' }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--text-strong)' }}>{s.label}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.65 }}>{s.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── FEATURES (BENTO) ─────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '40px 24px 72px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 14 }}>FEATURES</div>
            <h2 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12, color: 'var(--text-strong)' }}>
              Everything an accountant needs
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Built specifically for CAs, finance teams & bookkeepers.</p>
          </div>
        </Reveal>
        <div className="bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {FEATURES_BENTO.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 70} style={{ gridColumn: f.big ? 'span 2' : 'span 1' }}>
              <div className="card card-hover" style={{
                padding: f.big ? 30 : 24, height: '100%',
                background: f.big ? 'linear-gradient(140deg, var(--accent-bg) 0%, var(--surface) 55%)' : 'var(--surface)',
              }}>
                <div style={{ width: 46, height: 46, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--accent)' }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: f.big ? 17 : 14.5, fontWeight: 600, marginBottom: 8, color: 'var(--text-strong)' }}>{f.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────── */}
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px 72px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 14 }}>WHY BANKXL</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3.2vw, 38px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              How we compare
            </h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="card" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '16px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 1.5 }}>FEATURE</th>
                  <th style={{ padding: '16px 22px', textAlign: 'left', fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono, monospace', letterSpacing: 1.5 }}>BANKXL</th>
                  <th style={{ padding: '16px 22px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', letterSpacing: 1.5 }}>OTHERS</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '13px 22px', fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{c.feat}</td>
                    <td style={{ padding: '13px 22px', fontSize: 13.5 }}>
                      {c.us === true ? (
                        <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: 6, background: 'var(--accent-bg)', alignItems: 'center', justifyContent: 'center' }}>{I.check}</span>
                          Yes
                        </span>
                      ) : <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.us}</span>}
                    </td>
                    <td style={{ padding: '13px 22px', fontSize: 13.5 }}>
                      {c.others === false
                        ? <span style={{ color: 'var(--text-faint)' }}>—</span>
                        : <span style={{ color: 'var(--text-muted)' }}>{c.others}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '40px 24px 72px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 14 }}>TESTIMONIALS</div>
            <h2 className="display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Loved by accountants everywhere
            </h2>
          </div>
        </Reveal>
        <div className="testimonial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div className="card card-hover" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                  {Array.from({ length: t.rating }).map((_, j) => <span key={j}>{I.star}</span>)}
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 18, flex: 1 }}>
                  “{t.text}”
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div className="display" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gradient-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 740, margin: '0 auto', padding: '40px 24px 72px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, marginBottom: 14 }}>FAQ</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3.2vw, 38px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-strong)' }}>
              Frequently asked
            </h2>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="card" style={{ borderRadius: 20, padding: '8px 26px' }}>
            {FAQ.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}
                  style={{ width: '100%', textAlign: 'left', padding: '19px 0', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 15, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontWeight: 500 }}>
                  {faq.q}
                  <span aria-hidden style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: openFaq === i ? 'var(--accent)' : 'var(--surface-2)',
                    color: openFaq === i ? 'var(--on-accent)' : 'var(--text-muted)',
                    border: '1px solid ' + (openFaq === i ? 'var(--accent)' : 'var(--border)'),
                    fontSize: 16, transition: 'all 0.22s ease',
                    transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                  }}>+</span>
                </button>
                <div style={{
                  display: 'grid', gridTemplateRows: openFaq === i ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.3s cubic-bezier(0.21, 0.6, 0.35, 1)',
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, paddingBottom: 19, margin: 0 }}>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 24px 88px' }}>
        <Reveal>
          <div style={{
            position: 'relative', borderRadius: 28, overflow: 'hidden',
            background: 'var(--gradient-panel)', padding: 'clamp(48px, 7vw, 80px) 32px',
            textAlign: 'center', boxShadow: 'var(--shadow-lg)',
          }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div aria-hidden style={{ position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)', width: 560, height: 280, background: 'radial-gradient(ellipse, rgba(0,229,160,0.25), transparent 70%)', filter: 'blur(30px)' }} />
            <div style={{ position: 'relative' }}>
              <h2 className="display" style={{ fontSize: 'clamp(32px, 4.4vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#ffffff', lineHeight: 1.08 }}>
                Stop typing.<br />Start converting.
              </h2>
              <p style={{ fontSize: 16.5, color: 'rgba(255,255,255,0.72)', marginBottom: 36, lineHeight: 1.65, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                50 free pages every month. No credit card. No commitment.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login?signup=true" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#00e5a0', color: '#021511', padding: '16px 34px', borderRadius: 14,
                  fontWeight: 700, fontSize: 15.5, textDecoration: 'none',
                  boxShadow: '0 12px 36px rgba(0,229,160,0.35)',
                }}>
                  Create free account
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link href="/pricing" style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', padding: '16px 34px', borderRadius: 14, fontWeight: 500, fontSize: 15.5, textDecoration: 'none',
                  backdropFilter: 'blur(8px)',
                }}>
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
      <style jsx>{`
        .bank-chip {
          font-size: 12.5px;
          padding: 9px 18px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--text-dim);
          background: var(--surface);
          white-space: nowrap;
          flex-shrink: 0;
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .bento { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .bento { grid-template-columns: 1fr !important; }
          .bento > :global(div) { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  )
}
