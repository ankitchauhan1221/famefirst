import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { appUrl } from "./config";
import { db } from "./db";
import { ApiError } from "./http";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be set to at least 32 characters.");
  return new TextEncoder().encode(value);
}

export async function setSession(user: { id: string; sessionVersion: number }) {
  const token = await new SignJWT({ v: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl().startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export const currentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret()));
  } catch {
    return null;
  }
  const user = await db.user.findUnique({ where: { id: String(payload.sub) } });
  if (!user || user.blocked || user.sessionVersion !== payload.v) return null;
  return user;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function apiUser() {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Please log in again.");
  return user;
}

export async function apiAdmin() {
  const user = await apiUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "Admins only.");
  return user;
}
