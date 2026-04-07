"use client";

import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { showToast } from "@/components/ui/toast/toast";
import { createClient } from "@/lib/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HTMLInputTypeAttribute, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const supabase = createClient();

  // Get redirectTo from URL params
  const redirectTo = searchParams.get("redirectTo");

  const [inputType, setInputType] =
    useState<HTMLInputTypeAttribute>("password");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signinFormSchema = z.object({
    email: z.email({
      message: "Please provide a valid email.",
    }),
    password: z.string().trim(),
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    criteriaMode: "all",
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: zodResolver(signinFormSchema),
  });

  const handleSubmit = async (data: z.infer<typeof signinFormSchema>) => {
    try {
      setIsSubmitting(true);

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const destination =
        redirectTo && redirectTo.startsWith("/app") ? redirectTo : "/app";

      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        ...data,
        options: {
          emailRedirectTo: `${siteUrl}${destination}`,
        },
      });

      if (!user || error) {
        throw error;
      }

      window.location.href = destination;
    } catch (error) {
      showToast({
        title: "Failed to create account.",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "expanded",
        type: "error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex w-full flex-col gap-y-4"
      ref={formRef}
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <div className="grid gap-2">
        <Label>Email</Label>
        <Input
          autoFocus
          placeholder="apricot@email.com"
          {...form.register("email")}
        />
      </div>

      <div className="grid gap-2">
        <Label>Password</Label>
        <Input
          autoFocus
          placeholder="••••••"
          type={inputType}
          showPasswordViewToggle
          onPasswordViewToggleClick={() => {
            setInputType(inputType === "password" ? "text" : "password");
          }}
          {...form.register("password")}
        />
      </div>

      <Link href="/login" className="-mt-2 self-start">
        <Button variant="link" type="button" label="Have an account? Login" />
      </Link>

      <Button
        label="Continue"
        type="submit"
        className="mt-2"
        isLoading={isSubmitting}
        disabled={isSubmitting || !form.formState.isValid}
      />
    </form>
  );
}
