"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 10_000;

export function LiveOrders({ active, signature }: { active: number; signature: string }) {
  const router = useRouter();
  const latest = useRef(signature);

  useEffect(() => {
    latest.current = signature;
  }, [signature]);

  useEffect(() => {
    if (active === 0) return;
    let busy = false;

    async function poll() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch("/api/orders/live", { method: "POST" });
        if (response.ok) {
          const data = (await response.json()) as { signature: string };
          if (data.signature !== latest.current) {
            latest.current = data.signature;
            router.refresh();
          }
        }
      } catch {
        // Offline for a moment. The next poll tries again.
      } finally {
        busy = false;
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [active, router]);

  if (active === 0) return null;
  return <p className="muted" role="status">● Updating live</p>;
}
