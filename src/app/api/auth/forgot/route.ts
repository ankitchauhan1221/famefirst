import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { appUrl } from "@/lib/config";
import { db } from "@/lib/db";
import { api, ApiError, clientIp } from "@/lib/http";
import { sendPasswordReset } from "@/lib/mail";
import { allow } from "@/lib/rate-limit";

const schema = z.object({ email: z.email("Enter a valid email.").toLowerCase() });

export const POST = api(async (req) => {
  const { email } = schema.parse(await req.json());
  if (!allow(`forgot:${clientIp(req)}`, 10, 3_600_000) || !allow(`forgot:${email}`, 3, 3_600_000)) {
    throw new ApiError(429, "Too many attempts. Try again later.");
  }
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    await sendPasswordReset(email, `${appUrl()}/reset-password?token=${token}`).catch((error) => console.error("Reset email failed", error));
  }
  return { message: "If that email is registered, a reset link is on its way." };
});
