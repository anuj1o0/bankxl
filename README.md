# BankXL — Bank Statement PDF to Excel Converter

Production-grade SaaS that converts bank statement PDFs into clean Excel/CSV/JSON/Tally XML files using free Gemini AI. Built for the Indian CA market.

## Tech stack

| Layer | Stack | Cost |
|-------|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Free (Vercel) |
| Auth | Supabase (email + Google OAuth) | Free tier: 50k MAU |
| Database | Supabase Postgres | Free tier: 500 MB |
| AI extraction | Google Gemini 2.5 Flash | Free tier: 1,500 req/day |
| Payments | Razorpay (UPI + cards) | Pay only on transactions (2% domestic, 3% international) |
| Excel | ExcelJS | Free |

**You can launch and serve your first 100+ users for ₹0/month** — Stripe takes a cut only when you charge.

## Features

- AI extraction of bank, account, period, IFSC + every transaction
- 4 output formats: Excel (.xlsx), CSV, JSON, Tally Prime XML
- Color-coded Excel with summary + by-type breakdown
- 100+ Indian banks supported (SBI, HDFC, ICICI, Axis, Kotak, PNB, ...)
- Free tier (3 conversions/month) — no credit card needed
- Day Pass (₹49 for 24 hours) — for one-off jobs
- Pro plan (₹299/mo) — unlimited conversions
- Firm plan (₹1,499/mo) — REST API + bulk upload + team seats + white-label
- REST API with API-key authentication
- GST-compliant invoices (via Stripe)
- Zero data retention — files never written to disk

## Quick start

### 1. Install
```bash
git clone https://github.com/yourusername/bankxl.git
cd bankxl
npm install
cp .env.example .env.local
```

### 2. Supabase
1. Create a project at [supabase.com](https://supabase.com) (free tier)
2. SQL Editor → paste contents of `supabase/schema.sql` → Run
3. (Optional) Auth → Providers → Google → connect your OAuth app
4. Project Settings → API → copy URL, anon key, service role key into `.env.local`

### 3. Gemini (free)
1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → Create API key
2. Paste into `.env.local` as `GEMINI_API_KEY`

### 4. Razorpay
1. Sign up at [dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup) — works for Indian individuals/proprietors with just PAN
2. Toggle **Test Mode** (top-right). Test mode works immediately while KYC processes (1-2 days).
3. **Settings → API Keys → Generate Test Key** → copy `Key ID` (`rzp_test_xxx`) and `Key Secret` to `.env.local`
4. **Subscriptions → Plans → + Create plan** — make 4 plans:
   - **Pro Monthly** — ₹499, billing: Monthly, name: BankXL Pro (800 pages/mo)
   - **Pro Annual** — ₹4,999, billing: Yearly, name: BankXL Pro Annual (800 pages/mo)
   - **Firm Monthly** — ₹4,999, billing: Monthly, name: BankXL Firm (8,000 pages/mo)
   - **Firm Annual** — ₹49,999, billing: Yearly, name: BankXL Firm Annual (8,000 pages/mo)

   *(Day Pass and Top-ups use one-time Orders — no plans needed. Day Pass = ₹49/100 pages, Top-up = ₹100/60 pages.)*
5. Copy each plan ID (`plan_xxx`) into the corresponding `RAZORPAY_PLAN_*` env var
6. **Settings → Webhooks → + Add new webhook**:
   - URL: `https://yourdomain.com/api/razorpay/webhook`
   - Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `payment.captured`, `payment.failed`
   - Set a webhook secret (any random string) → copy to `RAZORPAY_WEBHOOK_SECRET`

### 5. Run
```bash
npm run dev
# http://localhost:3000
```

For local testing without auth: set `SKIP_AUTH=true` in `.env.local`.

### 6. Deploy
```bash
npm install -g vercel
vercel
# Then in Vercel dashboard → Project Settings → Environment Variables: paste all .env.local values
```

Add your custom domain in Vercel → Domains. Update `NEXT_PUBLIC_APP_URL` in env.

## Project structure

```
app/
  api/
    convert/       — main user-facing conversion endpoint
    v1/convert/    — public REST API for Firm plan (API key auth)
    stripe/        — checkout, portal, webhook
    usage/         — dashboard data
    auth/callback/ — legacy redirect to /auth/callback
  auth/callback/   — Supabase OAuth callback
  dashboard/       — user dashboard (history, billing, API key)
  login/           — sign in / sign up / forgot password
  pricing/         — pricing tiers + day pass
  banks/           — supported banks list
  api-docs/        — REST API documentation
  sample/          — try the converter
  about/, contact/, privacy/, terms/, refund/  — info pages
  page.tsx         — landing page
  layout.tsx       — root layout + SEO metadata
  sitemap.ts, robots.ts — SEO
components/
  Nav.tsx, Footer.tsx, Logo.tsx, Converter.tsx, LegalPage.tsx
lib/
  gemini.ts        — Gemini extraction + metadata
  excel.ts         — formatted Excel output
  formats.ts       — CSV, JSON, Tally XML exports
  supabase.ts      — client + plan limits
  supabase-server.ts — server-side Supabase clients
  stripe.ts        — plan configs
supabase/
  schema.sql       — full DB schema
middleware.ts      — auth guard + security headers
```

## Pricing

| Plan | Monthly | Annual | Conversions | Formats | API |
|------|---------|--------|-------------|---------|-----|
| Free | ₹0 | — | 3 | Excel | — |
| Day Pass | ₹49 (24h) | — | 10 | All | — |
| Pro | ₹299 | ₹2,999 | Unlimited | All | — |
| Firm | ₹1,499 | ₹14,999 | Unlimited | All | ✓ |

## Revenue projections

| Subscribers | Pro MRR | Firm MRR | Total MRR |
|-------------|---------|----------|-----------|
| 100 | ₹29,900 | — | ~₹30k |
| 500 | ₹1,49,500 | ₹14,990 (10) | ~₹1.65L |
| 1,000 | ₹2,99,000 | ₹74,950 (50) | ~₹3.7L |

Cost per conversion (Gemini paid tier, beyond free 1,500/day): ~₹0.50–₹1.50.

## Launch checklist

- [ ] Supabase project created and schema applied
- [ ] Gemini API key set
- [ ] Stripe account activated, 5 price IDs configured
- [ ] Stripe webhook configured
- [ ] Domain pointed to Vercel deployment
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Test full flow: sign up → convert → pay → API call (Firm)
- [ ] Email setup: support@yourdomain.com inbox
- [ ] Test refund flow in Stripe dashboard
- [ ] Submit to Google Search Console (sitemap.xml)

## Going to market

1. **Reddit/Twitter**: r/IndianAccounting, r/StartupIndia, post your build with a free conversion offer
2. **CA forums**: caclub.in, CAClubIndia — share a tutorial post
3. **LinkedIn**: target CA firms with 5–50 employees
4. **YouTube**: 60-second demo videos for each major bank (SBI, HDFC, ICICI)
5. **Cold email**: small CA firms in your city (start with 50 manual emails)
6. **WhatsApp**: ask friends in CA practice to share

Aim: first 10 paying users in 30 days.

## Support

- support@bankxl.in (general)
- privacy@bankxl.in (data/GDPR)
- sales@bankxl.in (enterprise)
