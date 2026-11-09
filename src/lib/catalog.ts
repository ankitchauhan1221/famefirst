import { db } from "./db";
import { provider } from "./provider";

export const getSettings = () => db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

// Only "Default" services take just a link and quantity, which is what the order form collects.
const isSupported = (type: string) => type.trim().toLowerCase() === "default";

export async function syncCatalog() {
  const services = await provider.services();
  if (!Array.isArray(services) || services.length === 0) throw new Error("Provider returned no services.");

  const seenAt = new Date();
  let imported = 0;
  for (const item of services) {
    const rate = Number(item.rate);
    const min = Number(item.min);
    const max = Number(item.max);
    if (!Number.isFinite(rate) || !Number.isInteger(min) || !Number.isInteger(max)) continue;
    const data = {
      name: item.name,
      category: item.category,
      type: item.type,
      providerRate: rate,
      min,
      max,
      refill: Boolean(item.refill),
      cancel: Boolean(item.cancel),
      supported: isSupported(item.type),
      lastSeenAt: seenAt,
    };
    await db.service.upsert({
      where: { providerServiceId: String(item.service) },
      update: data,
      create: { ...data, providerServiceId: String(item.service) },
    });
    imported += 1;
  }

  const removed = await db.service.updateMany({
    where: { lastSeenAt: { lt: seenAt } },
    data: { enabled: false, supported: false },
  });
  return { imported, removed: removed.count };
}
