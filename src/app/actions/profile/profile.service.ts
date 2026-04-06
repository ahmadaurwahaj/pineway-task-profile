"use server";

import { ErrorCode } from "@/lib/errors";
import { Result, captureAndReturnError, failure, success } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { numbers } from "nanoid-dictionary";
import { db } from "~/db";
import type { Profile, UpdateProfile } from "~/db/schema/profiles";
import { profilesTable } from "~/db/schema/profiles";

export type ProfileWithUser = Profile & { email: string; displayName: string };

const nanoid = customAlphabet(numbers, 6);

export async function createProfile(userId: string): Promise<Result<Profile>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user?.email || error) {
      return failure({
        code: ErrorCode.UNAUTHORIZED,
        message: "User not authenticated",
        userMessage: "You must be logged in to create a profile.",
      });
    }

    const email = user.email;
    const localPart = email.split("@")[0];
    const username = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const randomizedUsername = `${username}_${nanoid()}`;

    const [profile] = await db
      .insert(profilesTable)
      .values({ userId, username: randomizedUsername })
      .returning();

    return success(profile);
  } catch (error) {
    return captureAndReturnError({
      code: ErrorCode.DATABASE_ERROR,
      message: "Failed to create profile",
      userMessage: "We couldn't set up your profile. Please try again.",
      originalError: error,
    });
  }
}

export async function getUserProfile(): Promise<Result<ProfileWithUser>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return failure({
        code: ErrorCode.UNAUTHORIZED,
        message: "User not authenticated",
        userMessage: "You must be logged in to view your profile.",
      });
    }

    let [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, user.id));

    if (!profile) {
      // Auto-create profile for users who bypassed the sign-up form
      const created = await createProfile(user.id);
      if (!created.success) {
        return failure(created.error);
      }
      profile = created.data;
    }

    return success({
      ...profile,
      email: user.email ?? "",
      displayName: user.user_metadata?.display_name ?? "",
    });
  } catch (error) {
    return captureAndReturnError({
      code: ErrorCode.DATABASE_ERROR,
      message: "Failed to fetch profile",
      userMessage: "We couldn't load your profile. Please try again.",
      originalError: error,
    });
  }
}

export async function getPublicUserProfile(
  username: string,
): Promise<Result<Pick<Profile, "username" | "avatarUrl">>> {
  try {
    const [profile] = await db
      .select({
        username: profilesTable.username,
        avatarUrl: profilesTable.avatarUrl,
      })
      .from(profilesTable)
      .where(eq(profilesTable.username, username));

    if (!profile) {
      return failure({
        code: ErrorCode.NOT_FOUND,
        message: "Profile not found",
        userMessage: "This user doesn't exist.",
      });
    }

    return success(profile);
  } catch (error) {
    return captureAndReturnError({
      code: ErrorCode.DATABASE_ERROR,
      message: "Failed to fetch public profile",
      userMessage: "We couldn't load this profile. Please try again.",
      originalError: error,
    });
  }
}

export type UpdateProfilePayload = UpdateProfile & {
  email?: string;
  displayName?: string;
};

export async function updateUserProfile(
  data: UpdateProfilePayload,
): Promise<Result<ProfileWithUser>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return failure({
        code: ErrorCode.UNAUTHORIZED,
        message: "User not authenticated",
        userMessage: "You must be logged in to update your profile.",
      });
    }

    const { email, displayName, ...profileDataInit } = data;
    let profileData: typeof profileDataInit = { ...profileDataInit };

    if (email && email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email,
      });
      if (emailError) {
        return failure({
          code: ErrorCode.BUSINESS_LOGIC_ERROR,
          message: emailError.message,
          userMessage: "Failed to update email. Please try again.",
        });
      }
    }

    if (displayName !== undefined) {
      const { error: nameError } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });
      if (nameError) {
        return failure({
          code: ErrorCode.BUSINESS_LOGIC_ERROR,
          message: nameError.message,
          userMessage: "Failed to update display name. Please try again.",
        });
      }
    }

    const hasProfileUpdates = Object.keys(profileData).length > 0;

    // Enforce 14-day username change restriction (only after first manual change)
    if (profileData.username) {
      const [current] = await db
        .select({
          username: profilesTable.username,
          usernameChangedAt: profilesTable.usernameChangedAt,
        })
        .from(profilesTable)
        .where(eq(profilesTable.userId, user.id));

      if (current && current.username !== profileData.username) {
        // usernameChangedAt is null for auto-generated usernames — no restriction on first change
        if (current.usernameChangedAt) {
          const daysSinceChange =
            (Date.now() - new Date(current.usernameChangedAt).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSinceChange < 14) {
            const daysLeft = Math.ceil(14 - daysSinceChange);
            return failure({
              code: ErrorCode.BUSINESS_LOGIC_ERROR,
              message: "Username changed too recently",
              userMessage: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
            });
          }
        }
        // Stamp the change time only when username actually changes
        profileData = { ...profileData, usernameChangedAt: new Date() };
      } else {
        // Same username submitted — drop it to avoid a pointless update
        delete profileData.username;
      }
    }

    let profile: Profile;

    if (hasProfileUpdates) {
      const [updated] = await db
        .update(profilesTable)
        .set(profileData)
        .where(eq(profilesTable.userId, user.id))
        .returning();

      if (!updated) {
        // No profile row yet — create one then apply the update
        const created = await createProfile(user.id);
        if (!created.success) {
          return failure(created.error);
        }
        const [retried] = await db
          .update(profilesTable)
          .set(profileData)
          .where(eq(profilesTable.userId, user.id))
          .returning();
        if (!retried) {
          return failure({
            code: ErrorCode.NOT_FOUND,
            message: "Profile not found",
            userMessage: "We couldn't find the profile to update.",
          });
        }
        profile = retried;
      } else {
        profile = updated;
      }
    } else {
      let [existing] = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, user.id));

      if (!existing) {
        const created = await createProfile(user.id);
        if (!created.success) {
          return failure(created.error);
        }
        existing = created.data;
      }

      profile = existing;
    }

    const {
      data: { user: refreshedUser },
    } = await supabase.auth.getUser();

    return success({
      ...profile,
      email: refreshedUser?.email ?? user.email ?? "",
      displayName:
        refreshedUser?.user_metadata?.display_name ??
        user.user_metadata?.display_name ??
        "",
    });
  } catch (error) {
    return captureAndReturnError({
      code: ErrorCode.DATABASE_ERROR,
      message: "Failed to update profile",
      userMessage: "We couldn't update your profile. Please try again.",
      originalError: error,
    });
  }
}
