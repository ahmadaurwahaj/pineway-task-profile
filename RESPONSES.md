# Responses

## Live URL

> https://pineway-hiring.vercel.app

---

## What I built

- Login and sign-up using Supabase Auth
- Profile settings page where users can update their name, email, username, avatar, and a private note that only they can see
- Username changes are limited to once every 14 days
- Public profile page at `/@username` that shows the display name, username, and avatar

---

## Thought process

### RLS + Drizzle pattern

Every database query goes through `createDrizzleSupabaseClient()` and the `rls()` wrapper. The `rls()` function runs each query inside a Postgres transaction and sets `request.jwt.claims`, `request.jwt.claim.sub`, and the user role with `set_config` and `set local role`. This lets Postgres RLS policies do the actual security check at the database level, not just in the app code.

For the profiles table:

- **SELECT** is open to `anon` and `authenticated` so public profile pages load without needing a login.
- **INSERT / UPDATE** are only allowed for `authenticated` users where `auth.uid() = "userId"`, so users can only change their own row.

For the avatars storage bucket:

- **SELECT** is public since the bucket is public.
- **INSERT / UPDATE / DELETE** check `(storage.foldername(name))[1] = auth.uid()::text` so users can only upload or delete files inside their own `{userId}/` folder.

### Username change race condition

The 14-day check reads the current username, checks the timestamp, and then writes the new one. I wrapped all of that inside a single `rls()` call so it runs in one Postgres transaction. This stops two requests from both passing the check at the same time and both doing the update.

### hasProfileUpdates bug fix

The old code set `hasProfileUpdates = Object.keys(profileData).length > 0` before the username logic ran. The username logic could then delete `profileData.username` if it had not changed. So if a user only submitted their current username, `hasProfileUpdates` would be `true` but `profileData` would be empty, and Drizzle would throw an error on `.set({})`. I moved the check to run after all changes to `profileData` are done.

### Display name on public profiles

The `auth.users` metadata is not visible to the `anon` role, so I added a `displayName` column to the profiles table. It gets saved on profile creation and updated every time the user changes their name. The public profile page shows it above the `@username`.

### Server-side validation

The `UpdateProfileSchema` in the Hono route now checks username format (min 3, max 30, only `a-z`, `0-9`, and `_`), bio length (max 500), and display name length (min 1 if provided). This matches the client-side `profileFormSchema` and stops anyone from skipping the frontend validation by calling the API directly.

### Type safety

I added back `satisfies z.ZodType<UpdateProfilePayload>` on the route schema. This makes the TypeScript compiler show an error if the Zod schema and the service or database types get out of sync.

---

## Notes

`0003_avatars_storage.sql` is written by hand. Drizzle cannot generate Supabase Storage bucket config so raw SQL was the only way to do it.

`0007_fix_avatar_storage_rls.sql` replaces the old avatar storage policies that let any logged-in user overwrite anyone's files. The new policies check the folder name against `auth.uid()` so users can only touch their own files.

`0008_add_display_name.sql` adds the `displayName` column to the profiles table so the public profile page can show it.

`0009_reenable_profiles_rls.sql` re-enables RLS on the profiles table with the correct policies after a previous migration had turned it off.

There is also a fallback in `getUserProfile` and `updateUserProfile` that creates a profile row automatically if a user exists in Auth but has no profile yet. This covers users created directly from the Supabase dashboard.
