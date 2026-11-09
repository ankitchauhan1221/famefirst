import bcrypt from "bcryptjs";
import { z } from "zod";
import { setSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { api, ApiError, clientIp } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

const schema = z.object({ identifier: z.string().trim().toLowerCase().min(1), password: z.string().min(1).max(72) });

export const POST = api(async (req) => {
  const { identifier, password } = schema.parse(await req.json());
  if (!allow(`login:ip:${clientIp(req)}`, 30, 900_000) || !allow(`login:id:${identifier}`, 10, 900_000)) {
    throw new ApiError(429, "Too many attempts. Try again in 15 minutes.");
  }
  const user = await db.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Wrong username or password.");
  }
  if (user.blocked) throw new ApiError(403, "This account is blocked. Contact support.");
  await setSession(user);
});
