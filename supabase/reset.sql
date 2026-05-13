-- ⚠️ DESTRUCTIVE — DELETES ALL APP DATA
-- Use this when you want to start fresh for testing.
-- Run in Supabase SQL Editor.
--
-- After running this, paste schema.sql to recreate everything fresh.
-- ────────────────────────────────────────────────────────────────────

-- 1. Drop trigger first (depends on the function)
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Drop functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.add_pages_used(uuid, integer) cascade;
drop function if exists public.increment_conversions(uuid) cascade;
drop function if exists public.cleanup_stale_pending(uuid) cascade;

-- 3. Drop all app tables (cascade handles policies, indexes, FKs)
drop table if exists public.api_logs cascade;
drop table if exists public.team_members cascade;
drop table if exists public.day_passes cascade;
drop table if exists public.conversions cascade;
drop table if exists public.profiles cascade;

-- 4. (Optional) Delete all auth users — uncomment to wipe logins too.
--    Without this, your old login still works but has no profile data.
-- delete from auth.users;

-- ────────────────────────────────────────────────────────────────────
-- After this:
-- 1. Run the entire contents of schema.sql to recreate tables
-- 2. (Optional) Delete your test auth user from
--    Supabase Dashboard → Authentication → Users
--    so you can sign up again with the same email
-- ────────────────────────────────────────────────────────────────────
