-- Enable Row Level Security on the profiles table
alter table "profiles" enable row level security;

-- SELECT: anyone (including anon) can read profiles for public profile pages
create policy "profiles_select_public"
on "profiles"
for select
to anon, authenticated
using (true);

-- INSERT: authenticated users can only insert their own profile
create policy "profiles_insert_own"
on "profiles"
for insert
to authenticated
with check (auth.uid() = "userId");

-- UPDATE: authenticated users can only update their own profile
create policy "profiles_update_own"
on "profiles"
for update
to authenticated
using (auth.uid() = "userId")
with check (auth.uid() = "userId");
