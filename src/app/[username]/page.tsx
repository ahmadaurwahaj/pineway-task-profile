import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar/avatar";
import { getServerHttpClient } from "@/lib/http/server";
import { notFound } from "next/navigation";
import { parseResponse } from "hono/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const httpClient = await getServerHttpClient();
  const result = await parseResponse(
    httpClient.actions.profile[":username"].$get({
      param: { username: cleanUsername },
    }),
  );

  if (!result.success) {
    return {
      title: "User Not Found - Pineway",
      description: "This user profile does not exist",
      icons: {
        icon: "/pineway-logo-mark.svg",
      },
    };
  }

  const profile = result.data;
  const displayName = profile.displayName || cleanUsername;

  return {
    title: `${displayName} (@${profile.username}) - Pineway`,
    description: `View ${displayName}'s profile on Pineway`,
    icons: {
      icon: "/pineway-logo-mark.svg",
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const httpClient = await getServerHttpClient();
  const result = await parseResponse(
    httpClient.actions.profile[":username"].$get({
      param: { username: cleanUsername },
    }),
  );

  if (!result.success) {
    notFound();
  }

  const profile = result.data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <Avatar src={profile.avatarUrl ?? ""} type="circular" size="96" />
        <div className="flex flex-col gap-1">
          {profile.displayName && (
            <h1 className="text-lg font-semibold text-gray-900">
              {profile.displayName}
            </h1>
          )}
          <p className="text-sm text-gray-500">@{profile.username}</p>
        </div>
      </div>
    </div>
  );
}
