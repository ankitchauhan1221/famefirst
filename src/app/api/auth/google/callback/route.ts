import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { appUrl, googleEnabled } from "@/lib/config";
import { db } from "@/lib/db";

type GoogleProfile = { sub: string; email: string; email_verified: boolean };

async function fetchProfile(code: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return profileResponse.ok ? ((await profileResponse.json()) as GoogleProfile) : null;
}

async function findOrCreateUser(profile: GoogleProfile) {
  const email = profile.email.toLowerCase();
  const linked = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (linked) return linked;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Signup emails are unverified, so a password set earlier may not belong to this Google user.
    return db.user.update({
      where: { id: existing.id },
      data: { googleId: profile.sub, passwordHash: null, sessionVersion: { increment: 1 } },
    });
  }

  const base = email.split("@")[0].replace(/[^a-z0-9_.]/g, "").slice(0, 20) || "user";
  return db.user.create({ data: { email, googleId: profile.sub, username: `${base}_${randomBytes(3).toString("hex")}` } });
}

export async function GET(req: NextRequest) {
  const failed = NextResponse.redirect(`${appUrl()}/login?error=google`);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!googleEnabled() || !code || !state || state !== req.cookies.get("oauth_state")?.value) return failed;

  try {
    const profile = await fetchProfile(code);
    if (!profile?.email || !profile.email_verified) return failed;
    const user = await findOrCreateUser(profile);
    if (user.blocked) return failed;
    await setSession(user);
  } catch (error) {
    console.error("Google login failed", error);
    return failed;
  }

  const response = NextResponse.redirect(`${appUrl()}/dashboard`);
  response.cookies.delete("oauth_state");
  return response;
}
