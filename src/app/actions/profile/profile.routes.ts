import { validate } from "@/lib/http/validate";
import { Hono } from "hono";
import z from "zod";
import type { UpdateProfilePayload } from "./profile.service";
import {
  createProfile,
  getPublicUserProfile,
  getUserProfile,
  updateUserProfile,
} from "./profile.service";

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters.")
    .regex(
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores.",
    )
    .optional(),
  avatarUrl: z.string().optional(),
  bio: z
    .string()
    .max(500, "Profile note must be at most 500 characters.")
    .optional(),
  email: z.string().email().optional(),
  displayName: z.string().trim().min(1, "Name is required.").optional(),
}) satisfies z.ZodType<UpdateProfilePayload>;

const profileRoutes = new Hono()
  .post("/", validate("json", z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid("json");
    const result = await createProfile(userId);
    return c.json(result);
  })
  .patch("/", validate("json", UpdateProfileSchema), async (c) => {
    const profile = c.req.valid("json");
    const result = await updateUserProfile(profile);
    return c.json(result);
  })
  .get("/", async (c) => {
    const result = await getUserProfile();
    return c.json(result);
  })
  .get("/:username", async (c) => {
    const username = c.req.param("username");
    const result = await getPublicUserProfile(username);
    return c.json(result);
  });

export default profileRoutes;
