import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function api(handler: (req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest) => {
    try {
      if (req.method !== "GET" && !isSameOrigin(req)) throw new ApiError(403, "Request blocked.");
      const data = await handler(req);
      return NextResponse.json(data ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
      if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
      console.error(error);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export function clientIp(req: NextRequest) {
  // The left of X-Forwarded-For is client-supplied. The last entry is the one our proxy added.
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwarded || "local";
}
