# Responses

## Live URL

https://pineway-task-profile.vercel.app/

---

## What I built

I built the full profile feature on top of the existing codebase.

- Sign up and log in with Supabase Auth. After confirming their email, users land on the profile page where their profile is created automatically on first visit.
- A profile settings page where users can update their display name, email, username, avatar photo, and a private note. The note is only visible to the owner.
- Username changes are blocked for 14 days after the last change.
- A public profile page at `/@username` that shows the user's display name, username, and avatar. It works without being logged in.

---

## Thought process

### Fixing the hasProfileUpdates bug

The original code set `hasProfileUpdates = Object.keys(profileData).length > 0` before the username logic ran. The username logic could then delete `profileData.username` if it had not changed. So if a user submitted only their current username, `hasProfileUpdates` would be `true` but `profileData` would be empty, and Drizzle would throw on `.set({})`. I moved the check to run after all changes to `profileData` are done.

### Fixing the username change race condition

The 14-day check reads the current username, checks the timestamp, and writes the new one. I wrapped all of that inside a single `rls()` call so everything runs in one Postgres transaction. This stops two requests from both passing the check at the same time and both writing the update.

### Display name on public profiles

The `auth.users` metadata is not visible to the `anon` role, so I added a `displayName` column to the profiles table. It gets saved on profile creation and updated whenever the user changes their name. The public profile page shows it above the `@username`.

### Server-side validation

The `UpdateProfileSchema` in the Hono route checks username format (min 3, max 30, only `a-z`, `0-9`, and `_`), bio length (max 500), and display name (min 1 if provided). This matches the client-side schema and stops anyone from bypassing frontend validation by calling the API directly.

---

## Notes

`0003_avatars_storage.sql` is written by hand. Drizzle cannot generate Supabase Storage bucket setup so raw SQL was the only way.

`0007_fix_avatar_storage_rls.sql` replaces the old avatar storage policies that allowed any logged-in user to overwrite anyone else's files. The new policies check the folder name against `auth.uid()`.

`0008_add_display_name.sql` adds the `displayName` column to the profiles table.

`0009_reenable_profiles_rls.sql` re-enables RLS on the profiles table with the correct policies.

`getUserProfile` and `updateUserProfile` both have a fallback that creates a profile row automatically if a user exists in Auth but has no profile yet. This covers edge cases like users created directly in the Supabase dashboard.
