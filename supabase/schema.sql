-- BankXL Database Schema
-- Run this in your Supabase SQL Editor (idempotent — safe to re-run)

create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════

-- ─── Profiles ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free','pro','firm')),
  stripe_customer_id text,
  stripe_subscription_id text,
  conversions_this_month integer not null default 0,  -- legacy: now stores PAGES used
  conversions_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  api_key text unique default ('bxl_' || encode(gen_random_bytes(24), 'hex')),
  payment_failed_at timestamptz,
  brand_name text,
  default_format text default 'excel' check (default_format in ('excel','csv','json','tally')),
  email_notifications boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Conversions ────────────────────────────────────────────
create table if not exists public.conversions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  filename text not null,
  bank_name text,
  pages integer not null default 0,
  transactions_extracted integer not null default 0,
  output_format text default 'excel',
  status text not null default 'pending' check (status in ('pending','success','failed')),
  error_message text,
  file_size_bytes bigint,
  processing_time_ms integer,
  total_debit numeric(14,2) default 0,
  total_credit numeric(14,2) default 0,
  transactions_json jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ─── Day passes ─────────────────────────────────────────────
create table if not exists public.day_passes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  conversions_remaining integer not null default 100,  -- now: pages remaining
  expires_at timestamptz not null,
  stripe_session_id text,
  created_at timestamptz default now()
);

-- ─── Team members ───────────────────────────────────────────
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade,
  member_email text not null,
  member_id uuid references public.profiles(id) on delete set null,
  status text default 'invited' check (status in ('invited','active','removed')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique (owner_id, member_email)
);

-- ─── API logs ───────────────────────────────────────────────
create table if not exists public.api_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null,
  status integer not null,
  processing_time_ms integer,
  transactions integer,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
--  COLUMN MIGRATIONS (idempotent — safe on existing DBs)
-- ═══════════════════════════════════════════════════════════════

-- Profiles: extra columns added over time
alter table public.profiles add column if not exists brand_name text;
alter table public.profiles add column if not exists default_format text default 'excel';
alter table public.profiles add column if not exists email_notifications boolean default true;
alter table public.profiles add column if not exists razorpay_customer_id text;
alter table public.profiles add column if not exists razorpay_subscription_id text;
alter table public.profiles add column if not exists subscription_ends_at timestamptz;
alter table public.profiles add column if not exists plan_key text;
alter table public.profiles add column if not exists bonus_pages integer not null default 0;
-- Lemon Squeezy (international payments)
alter table public.profiles add column if not exists payment_provider text check (payment_provider in ('razorpay', 'lemonsqueezy'));
alter table public.profiles add column if not exists ls_subscription_id text;
alter table public.profiles add column if not exists ls_customer_id text;

-- Conversions: extra columns
alter table public.conversions add column if not exists total_debit numeric(14,2) default 0;
alter table public.conversions add column if not exists total_credit numeric(14,2) default 0;
alter table public.conversions add column if not exists transactions_json jsonb;
alter table public.conversions add column if not exists completed_at timestamptz;

-- Day passes: extra columns (Razorpay refs)
alter table public.day_passes add column if not exists razorpay_payment_id text;
alter table public.day_passes add column if not exists razorpay_order_id text;
-- Lemon Squeezy refs for day passes and top-ups
alter table public.day_passes add column if not exists ls_order_id text;

-- Team members: extra columns
alter table public.team_members add column if not exists invited_at timestamptz default now();
alter table public.team_members add column if not exists accepted_at timestamptz;

-- ═══════════════════════════════════════════════════════════════
--  ROW-LEVEL SECURITY + POLICIES
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.conversions enable row level security;
alter table public.day_passes enable row level security;
alter table public.team_members enable row level security;
alter table public.api_logs enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Conversions
drop policy if exists "Users can view own conversions" on public.conversions;
create policy "Users can view own conversions" on public.conversions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own conversions" on public.conversions;
create policy "Users can insert own conversions" on public.conversions
  for insert with check (auth.uid() = user_id);

-- Day passes
drop policy if exists "Users can view own day passes" on public.day_passes;
create policy "Users can view own day passes" on public.day_passes
  for select using (auth.uid() = user_id);

-- Team members
drop policy if exists "Owner can manage team" on public.team_members;
create policy "Owner can manage team" on public.team_members
  for all using (auth.uid() = owner_id);

drop policy if exists "Members can view own membership" on public.team_members;
create policy "Members can view own membership" on public.team_members
  for select using (auth.uid() = member_id);

-- API logs
drop policy if exists "Users can view own api logs" on public.api_logs;
create policy "Users can view own api logs" on public.api_logs
  for select using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
--  FUNCTIONS + TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-create profile + auto-link team invites on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Auto-link any pending team invites for this email
  update public.team_members
  set member_id = new.id, status = 'active', accepted_at = now()
  where lower(member_email) = lower(new.email) and member_id is null;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic pages-used counter (column name is legacy; semantics: pages)
create or replace function public.add_pages_used(p_user_id uuid, p_pages integer)
returns void as $$
begin
  update public.profiles
  set conversions_this_month = conversions_this_month + greatest(p_pages, 0),
      updated_at = now()
  where id = p_user_id;
end;
$$ language plpgsql security definer;

grant execute on function public.add_pages_used(uuid, integer) to anon, authenticated, service_role;

-- Backwards-compatible +1 incrementer (used in fallback paths)
create or replace function public.increment_conversions(p_user_id uuid)
returns void as $$
begin
  update public.profiles
  set conversions_this_month = conversions_this_month + 1,
      updated_at = now()
  where id = p_user_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_conversions(uuid) to anon, authenticated, service_role;

-- Mark stale pending conversions (>5 min old) as failed
create or replace function public.cleanup_stale_pending(p_user_id uuid)
returns integer as $$
declare
  affected integer;
begin
  with updated as (
    update public.conversions
    set status = 'failed',
        error_message = coalesce(error_message, 'Conversion timed out or was abandoned'),
        completed_at = now()
    where user_id = p_user_id
      and status = 'pending'
      and created_at < now() - interval '5 minutes'
    returning 1
  )
  select count(*) into affected from updated;
  return affected;
end;
$$ language plpgsql security definer;

grant execute on function public.cleanup_stale_pending(uuid) to anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════
--  INDEXES
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_conversions_user_id on public.conversions(user_id);
create index if not exists idx_conversions_created_at on public.conversions(created_at desc);
create index if not exists idx_conversions_user_created on public.conversions(user_id, created_at desc);
create index if not exists idx_conversions_pending on public.conversions(status, created_at) where status = 'pending';
create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_razorpay_customer on public.profiles(razorpay_customer_id);
create index if not exists idx_profiles_razorpay_subscription on public.profiles(razorpay_subscription_id);
create index if not exists idx_profiles_ls_subscription on public.profiles(ls_subscription_id);
create index if not exists idx_profiles_ls_customer on public.profiles(ls_customer_id);
create index if not exists idx_profiles_api_key on public.profiles(api_key);
create index if not exists idx_day_passes_user on public.day_passes(user_id, expires_at);
create index if not exists idx_team_members_owner on public.team_members(owner_id, status);
create index if not exists idx_team_members_member on public.team_members(member_id);
create index if not exists idx_api_logs_user on public.api_logs(user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
--  BACKFILL profiles for existing auth users
-- ═══════════════════════════════════════════════════════════════

insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
