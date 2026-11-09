import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, ApiError } from "@/lib/http";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long."),
});

export const POST = api(async (req) => {
  const { token, password } = schema.parse(await req.json());
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction(async (tx) => {
    const claimed = await tx.passwordReset.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ApiError(400, "This reset link is invalid or has expired.");
    const reset = await tx.passwordReset.findUniqueOrThrow({ where: { tokenHash } });
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  });
  return { message: "Password updated. You can log in now." };
});
