import { clearSession } from "@/lib/auth";
import { api } from "@/lib/http";

export const POST = api(async () => {
  await clearSession();
});
