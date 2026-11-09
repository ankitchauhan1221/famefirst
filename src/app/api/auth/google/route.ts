import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl, googleEnabled } from "@/lib/config";

export async function GET() {
  if (!googleEnabled()) return NextResponse.redirect(`${appUrl()}/login`);
  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl().startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
