-- Disable Row Level Security on profiles table.
-- Security is enforced at the application layer via supabase.auth.getUser()
-- on every server action before any database operation is performed.
alter table "profiles" disable row level security;

drop policy if exists "profiles_select_own" on "profiles";
drop policy if exists "profiles_insert_own" on "profiles";
drop policy if exists "profiles_update_own" on "profiles";
