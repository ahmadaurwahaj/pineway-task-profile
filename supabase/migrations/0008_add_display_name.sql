-- Add displayName column to profiles for public profile display.
-- Display name is also stored in auth.users metadata, but auth.users
-- is not accessible via anon role, so we denormalize it here.
ALTER TABLE "profiles" ADD COLUMN "displayName" text;
