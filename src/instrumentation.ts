// Polls provider order status from inside the server process.
// Hosts that run several instances should set DISABLE_INTERNAL_CRON=true and call /api/cron/sync-orders.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_INTERNAL_CRON === "true") return;
  const { syncOrders } = await import("./lib/orders");
  const timer = setInterval(() => {
    syncOrders().catch((error) => console.error("Order sync failed", error));
  }, 120_000);
  timer.unref?.();
}
