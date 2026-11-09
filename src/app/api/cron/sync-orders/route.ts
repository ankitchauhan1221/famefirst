import { NextRequest, NextResponse } from "next/server";
import { syncOrders } from "@/lib/orders";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await syncOrders());
}
