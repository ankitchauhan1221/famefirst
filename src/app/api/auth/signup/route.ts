import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { setSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { allow } from "@/lib/rate-limit";
import { api, ApiError, clientIp } from "@/lib/http";

const schema = z
  .object({
    email: z.email("Enter a valid email.").toLowerCase(),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,30}$/, "Username: 3-30 letters, numbers, dots or underscores."),
    whatsapp: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid WhatsApp number.").or(z.literal("")).optional(),
    password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long."),
    passwordAgain: z.string(),
    accept: z.literal(true, "Please accept the terms to continue."),
  })
  .refine((data) => data.password === data.passwordAgain, "Passwords do not match.");

export const POST = api(async (req) => {
  if (!allow(`signup:${clientIp(req)}`, 10, 3_600_000)) throw new ApiError(429, "Too many attempts. Try again later.");
  const input = schema.parse(await req.json());
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await db.user.create({
      data: { email: input.email, username: input.username, whatsapp: input.whatsapp || null, passwordHash },
    });
    await setSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(409, "That email or username is already registered.");
    }
    throw error;
  }
});
