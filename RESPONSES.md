# Responses

## Live URL

> _Add deployed URL here before submitting_

---

## What I built

- Login and sign-up via Supabase Auth
- Profile settings — name, email, username, avatar upload, and a private note (bio) only visible to the owner
- Username changes locked to once every 14 days
- Public profile page at `/@username` — shows username and avatar, nothing private

---

## Notes

`0003_avatars_storage.sql` is hand-written. Drizzle can't generate Supabase Storage bucket config, so raw SQL was the only option.

Added a profile auto-create fallback in `getUserProfile` and `updateUserProfile`. If a user exists in Auth but has no profile row (e.g. created directly in the dashboard), a row gets created on the fly instead of returning an error.
