-- Re-enable RLS on profiles with correct policies.
-- Migration 0006 had previously disabled RLS; this restores it with
-- the right access model: public reads + owner-only writes.

alter table "profiles" enable row level security;

-- Drop any lingering policies from previous migrations
drop policy if exists "profiles_select_own" on "profiles";
drop policy if exists "profiles_select_public" on "profiles";
drop policy if exists "profiles_insert_own" on "profiles";
drop policy if exists "profiles_update_own" on "profiles";

-- SELECT: anyone (including anon) can read profiles for public profile pages
create policy "profiles_select_public"
on "profiles"
for select
to anon, authenticated
using (true);

-- INSERT: authenticated users can only insert their own profile row
create policy "profiles_insert_own"
on "profiles"
for insert
to authenticated
with check (auth.uid() = "userId");

-- UPDATE: authenticated users can only update their own profile row
create policy "profiles_update_own"
on "profiles"
for update
to authenticated
using (auth.uid() = "userId")
with check (auth.uid() = "userId");
