"use client";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { HelperText } from "@/components/ui/helper-text/helper-text";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { Textarea } from "@/components/ui/textarea/textarea";
import { showToast } from "@/components/ui/toast/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "./profile-form-schema";
import { uploadAvatar } from "./upload-avatar";
import { useProfile, useUpdateProfile } from "./use-profile";

export default function ProfileSettingsForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.userId) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(file, profile.userId);
      await updateProfile.mutateAsync({ avatarUrl });
      showToast({ type: "success", title: "Profile photo updated!" });
    } catch (error) {
      setAvatarPreview(null);
      showToast({
        type: "error",
        title: "Failed to upload photo.",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "expanded",
      });
    } finally {
      setIsUploadingAvatar(false);
      URL.revokeObjectURL(preview);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      email: profile?.email ?? "",
      displayName: profile?.displayName ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
    mode: "onChange",
  });

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values);
      form.reset(values);
      showToast({
        type: "success",
        title: "Changes saved!",
        description: "Your basic information.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Failed to save changes.",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "expanded",
      });
    }
  };

  if (isLoading) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full pb-24">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-800">
              Profile photo
            </span>
            <span className="text-sm text-gray-500">
              The photo set here is global and will reflect on your Pineway
              page.
            </span>
          </div>
          <div className="relative">
            <Avatar
              src={avatarPreview ?? profile?.avatarUrl ?? ""}
              type="circular"
              size="64"
              showHoverOverlay={!isUploadingAvatar}
              onClick={!isUploadingAvatar ? handleAvatarClick : undefined}
            />
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <svg
                  className="size-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                  />
                </svg>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div>
          <FormRow
            label="Email"
            description="You will be asked to verify if your email is changed."
          >
            <Input
              {...form.register("email")}
              type="email"
              data-error={form.formState.errors.email ? "true" : undefined}
            />
            {form.formState.errors.email && (
              <HelperText type="error">
                {form.formState.errors.email.message}
              </HelperText>
            )}
          </FormRow>

          <FormRow label="Name" description="Your display name.">
            <Input
              {...form.register("displayName")}
              data-error={
                form.formState.errors.displayName ? "true" : undefined
              }
            />
            {form.formState.errors.displayName && (
              <HelperText type="error">
                {form.formState.errors.displayName.message}
              </HelperText>
            )}
          </FormRow>

          <FormRow
            label="Username"
            description="This can only be changed once every 14 days."
          >
            <Input
              {...form.register("username")}
              staticContent={{
                text: `${new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")}`,
              }}
              data-error={form.formState.errors.username ? "true" : undefined}
            />
            {form.formState.errors.username && (
              <HelperText type="error">
                {form.formState.errors.username.message}
              </HelperText>
            )}
          </FormRow>

          <FormRow
            label="Profile note"
            description="This is only visible to you."
          >
            <Textarea
              {...form.register("bio")}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            {form.formState.errors.bio && (
              <HelperText type="error">
                {form.formState.errors.bio.message}
              </HelperText>
            )}
          </FormRow>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-between rounded-2xl border max-w-xl w-full border-gray-200 bg-white px-5 py-2 sm:px-2 shadow-lg">
        <span className="text-sm text-gray-500 px-2">
          Your basic information.
        </span>
        <Button
          type="submit"
          label="Save changes"
          variant={isDirty ? "primary" : "neutral"}
          size="sm"
          disabled={!isDirty || !isValid}
          isLoading={updateProfile.isPending}
        />
      </div>
    </form>
  );
}

function FormRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mx-5 border-t border-gray-100 sm:mx-6" />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-24 sm:p-6">
        <div className="w-full sm:w-86 shrink-0 text-sm">
          <Label description={description}>{label}</Label>
        </div>
        <div className="flex w-full flex-col gap-1.5">{children}</div>
      </div>
    </div>
  );
}

function ProfileSettingsSkeleton() {
  return (
    <div className="w-full animate-pulse pb-24">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-3 w-56 rounded bg-gray-100" />
          </div>
          <div className="size-14 rounded-full bg-gray-100" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-start sm:gap-8 sm:p-6"
          >
            <div className="w-56 shrink-0">
              <div className="h-4 w-20 rounded bg-gray-100" />
              <div className="mt-1 h-3 w-40 rounded bg-gray-100" />
            </div>
            <div className="h-10 w-full rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center justify-between rounded-2xl border max-w-2xl w-full border-gray-200 bg-white px-5 py-3 sm:px-6 shadow-lg">
        <div className="h-4 w-36 rounded bg-gray-100" />
        <div className="h-8 w-28 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
