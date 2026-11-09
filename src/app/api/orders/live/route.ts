import { apiUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/http";
import { orderSignature, syncUserOrders } from "@/lib/orders";
import { allow } from "@/lib/rate-limit";

export const POST = api(async () => {
  const user = await apiUser();
  if (!allow(`live:${user.id}`, 30, 60_000)) throw new ApiError(429, "Too many requests.");
  try {
    await syncUserOrders(user.id);
  } catch (error) {
    // A provider hiccup should not break the page. The next poll tries again.
    console.error("Live order sync failed", error);
  }
  return { signature: await orderSignature(user.id) };
});
