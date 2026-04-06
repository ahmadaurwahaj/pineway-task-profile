import { validate } from "@/lib/http/validate";
import { Hono } from "hono";
import z from "zod";
import {
  createProfile,
  getPublicUserProfile,
  getUserProfile,
  updateUserProfile,
} from "./profile.service";

const UpdateProfileSchema = z.object({
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
});

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
