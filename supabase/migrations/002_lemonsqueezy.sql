-- ═══════════════════════════════════════════════════════════════
--  Migration: Add Lemon Squeezy (international payments) support
--  Run this in your Supabase SQL Editor — idempotent, safe to re-run
-- ═══════════════════════════════════════════════════════════════

-- New columns on profiles
alter table public.profiles
  add column if not exists payment_provider text
    check (payment_provider in ('razorpay', 'lemonsqueezy'));

alter table public.profiles
  add column if not exists ls_subscription_id text;

alter table public.profiles
  add column if not exists ls_customer_id text;

-- New column on day_passes (idempotent audit field for LS one-time orders)
alter table public.day_passes
  add column if not exists ls_order_id text;

-- Indexes
create index if not exists idx_profiles_ls_subscription
  on public.profiles(ls_subscription_id);

create index if not exists idx_profiles_ls_customer
  on public.profiles(ls_customer_id);

create index if not exists idx_day_passes_ls_order
  on public.day_passes(ls_order_id)
  where ls_order_id is not null;
