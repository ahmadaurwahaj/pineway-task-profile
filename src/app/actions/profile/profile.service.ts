"use server";

import { ErrorCode } from "@/lib/errors";
import { Result, captureAndReturnError, failure, success } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { numbers } from "nanoid-dictionary";
import { createDrizzleSupabaseClient } from "~/db";
import type { Profile, UpdateProfile } from "~/db/schema/profiles";
import { profilesTable } from "~/db/schema/profiles";

export type ProfileWithUser = Profile & { email: string };

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
    const displayName = user.user_metadata?.display_name ?? "";

    const db = await createDrizzleSupabaseClient();
    const [profile] = await db.rls(async (tx) => {
      return tx
        .insert(profilesTable)
        .values({ userId, username: randomizedUsername, displayName })
        .returning();
    });

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

    const db = await createDrizzleSupabaseClient();
    let [profile] = await db.rls(async (tx) => {
      return tx
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, user.id));
    });

    if (!profile) {
      const created = await createProfile(user.id);
      if (!created.success) {
        return failure(created.error);
      }
      profile = created.data;
    }

    return success({
      ...profile,
      email: user.email ?? "",
      displayName:
        profile.displayName ?? user.user_metadata?.display_name ?? "",
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
): Promise<Result<Pick<Profile, "username" | "avatarUrl" | "displayName">>> {
  try {
    const db = await createDrizzleSupabaseClient();
    const [profile] = await db.rls(async (tx) => {
      return tx
        .select({
          username: profilesTable.username,
          avatarUrl: profilesTable.avatarUrl,
          displayName: profilesTable.displayName,
        })
        .from(profilesTable)
        .where(eq(profilesTable.username, username));
    });

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

    const { email, ...profileDataInit } = data;
    let profileData: UpdateProfile = { ...profileDataInit };

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

    if (profileData.displayName !== undefined) {
      const { error: nameError } = await supabase.auth.updateUser({
        data: { display_name: profileData.displayName },
      });
      if (nameError) {
        return failure({
          code: ErrorCode.BUSINESS_LOGIC_ERROR,
          message: nameError.message,
          userMessage: "Failed to update display name. Please try again.",
        });
      }
    }

    const db = await createDrizzleSupabaseClient();

    // All DB operations in a single RLS transaction to prevent race conditions
    const txResult = await db.rls(async (tx) => {
      // Enforce 14-day username change restriction (only after first manual change)
      if (profileData.username) {
        const [current] = await tx
          .select({
            username: profilesTable.username,
            usernameChangedAt: profilesTable.usernameChangedAt,
          })
          .from(profilesTable)
          .where(eq(profilesTable.userId, user.id));

        if (current && current.username !== profileData.username) {
          if (current.usernameChangedAt) {
            const daysSinceChange =
              (Date.now() - new Date(current.usernameChangedAt).getTime()) /
              (1000 * 60 * 60 * 24);
            if (daysSinceChange < 14) {
              const daysLeft = Math.ceil(14 - daysSinceChange);
              return {
                blocked: true as const,
                daysLeft,
              };
            }
          }
          profileData = { ...profileData, usernameChangedAt: new Date() };
        } else {
          // Same username submitted — drop it to avoid a pointless update
          delete profileData.username;
        }
      }

      // Recompute hasProfileUpdates AFTER potential username mutation
      const hasProfileUpdates = Object.keys(profileData).length > 0;

      if (hasProfileUpdates) {
        const [updated] = await tx
          .update(profilesTable)
          .set(profileData)
          .where(eq(profilesTable.userId, user.id))
          .returning();
        return { blocked: false as const, profile: updated ?? null };
      } else {
        const [existing] = await tx
          .select()
          .from(profilesTable)
          .where(eq(profilesTable.userId, user.id));
        return { blocked: false as const, profile: existing ?? null };
      }
    });

    if (txResult.blocked) {
      return failure({
        code: ErrorCode.BUSINESS_LOGIC_ERROR,
        message: "Username changed too recently",
        userMessage: `You can change your username again in ${txResult.daysLeft} day${txResult.daysLeft === 1 ? "" : "s"}.`,
      });
    }

    let profile = txResult.profile;

    if (!profile) {
      const created = await createProfile(user.id);
      if (!created.success) {
        return failure(created.error);
      }
      // Re-apply updates on fresh profile if there was data to set
      const hasProfileUpdates = Object.keys(profileData).length > 0;
      if (hasProfileUpdates) {
        const [retried] = await db.rls(async (tx) => {
          return tx
            .update(profilesTable)
            .set(profileData)
            .where(eq(profilesTable.userId, user.id))
            .returning();
        });
        profile = retried ?? created.data;
      } else {
        profile = created.data;
      }
    }

    const {
      data: { user: refreshedUser },
    } = await supabase.auth.getUser();

    return success({
      ...profile,
      email: refreshedUser?.email ?? user.email ?? "",
      displayName:
        profile.displayName ??
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
