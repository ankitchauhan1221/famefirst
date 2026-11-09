import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/http";
import { placeOrder } from "@/lib/orders";
import { allow } from "@/lib/rate-limit";

const schema = z.object({
  serviceId: z.string().min(1, "Choose a service."),
  link: z.string().trim().min(1, "Enter a link or username.").max(500),
  quantity: z.coerce.number().int("Quantity must be a whole number.").positive("Enter a quantity."),
  clientKey: z.string().min(8).max(64),
});

export const POST = api(async (req) => {
  const user = await apiUser();
  if (!allow(`order:${user.id}`, 60, 60_000)) throw new ApiError(429, "Too many orders. Wait a minute and try again.");
  return placeOrder(user.id, schema.parse(await req.json()));
});
