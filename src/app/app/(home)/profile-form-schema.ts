import { z } from "zod";

export const profileFormSchema = z.object({
  email: z.string().email("Please provide a valid email."),
  displayName: z.string().trim().min(1, "Name is required."),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters.")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores.",
    ),
  bio: z
    .string()
    .max(500, "Profile note must be at most 500 characters.")
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
