-- 003_parser_failures.sql
-- Diagnostic telemetry for statements the deterministic engine declines, so we
-- know WHICH banks/formats/stages are failing and can prioritise parser fixes.
-- Run this in your Supabase SQL Editor (idempotent — safe to re-run).
--
-- PRIVACY: this table stores NON-PII diagnostics only — bank name, page count,
-- failure stage, confidence, reconciliation counts. It NEVER stores the file,
-- the transactions, amounts, account holder names, or account numbers. The only
-- way an actual file lands here is `sample_path`, which is set ONLY when a user
-- explicitly clicks "send us this statement" (opt-in), stored in the private
-- `failed-samples` bucket. This keeps the public "zero retention" promise true.

create table if not exists public.parser_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Nullable + set null on delete: telemetry survives account deletion but is
  -- never tied to a deleted user. dev-user (no real uuid) is stored as null.
  user_id uuid references auth.users on delete set null,

  -- Non-PII diagnostics ─────────────────────────────────────────────────────
  bank_detected text,               -- e.g. 'HDFC Bank', or null if detection failed
  page_count integer,
  file_size_bytes integer,
  failure_code text not null,       -- ParserErrorCode | 'VALIDATION_FAILED' | 'USER_REPORTED'
  failure_stage text,               -- StageName (e.g. 'table-detection')
  failure_message text,             -- truncated structural dev message, no row data
  parser_version text,
  confidence numeric,
  reconciled_links integer,
  checkable_links integer,
  breaks integer,
  transactions_extracted integer,
  format_requested text,

  -- Opt-in sample (only set when the user explicitly consents to share) ──────
  sample_shared boolean not null default false,
  sample_path text,                 -- path in the private 'failed-samples' bucket

  -- Triage workflow ─────────────────────────────────────────────────────────
  resolved boolean not null default false,  -- flip once the parser handles it
  notes text
);

-- Founder-only telemetry: RLS on with NO user policies means only the service
-- role (server / Supabase dashboard) can read or write. Regular users can't
-- see or touch this table.
alter table public.parser_failures enable row level security;

create index if not exists idx_parser_failures_created on public.parser_failures(created_at desc);
create index if not exists idx_parser_failures_bank on public.parser_failures(bank_detected);
create index if not exists idx_parser_failures_code on public.parser_failures(failure_code);
create index if not exists idx_parser_failures_unresolved on public.parser_failures(resolved, created_at desc) where resolved = false;
create index if not exists idx_parser_failures_samples on public.parser_failures(sample_shared, created_at desc) where sample_shared = true;

-- Private bucket for voluntarily-shared failed samples (opt-in only). Private =
-- no public URLs; only the service role can read/write. The report endpoint
-- also creates this on demand, so this insert is just belt-and-suspenders.
insert into storage.buckets (id, name, public)
values ('failed-samples', 'failed-samples', false)
on conflict (id) do nothing;
