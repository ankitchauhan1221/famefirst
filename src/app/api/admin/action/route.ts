import { z } from "zod";
import { apiAdmin } from "@/lib/auth";
import { getSettings, syncCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { api, ApiError } from "@/lib/http";
import { resolveReview, syncOrders } from "@/lib/orders";
import { credit, debit } from "@/lib/wallet";

const blankToNull = (value: unknown) => (value === "" || value === undefined ? null : value);
const optionalNumber = z.preprocess(blankToNull, z.coerce.number().min(0).nullable());

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("syncCatalog") }),
  z.object({ action: z.literal("syncOrders") }),
  z.object({
    action: z.literal("updateSettings"),
    defaultMargin: z.coerce.number().min(0).max(10_000),
    currencyMultiplier: z.coerce.number().positive(),
  }),
  z.object({
    action: z.literal("updateService"),
    id: z.string(),
    displayName: z.string().trim().max(120),
    marginPercent: optionalNumber,
    customPriceRupees: optionalNumber,
    enabled: z.boolean(),
  }),
  z.object({ action: z.literal("setCategory"), category: z.string(), enabled: z.boolean() }),
  z.object({ action: z.literal("enableAll") }),
  z.object({ action: z.literal("adjustBalance"), userId: z.string(), rupees: z.coerce.number().refine((n) => n !== 0, "Enter an amount."), note: z.string().trim().min(1, "Add a reason.").max(200) }),
  z.object({ action: z.literal("setBlocked"), userId: z.string(), blocked: z.boolean() }),
  z.object({ action: z.literal("refundReview"), orderId: z.string() }),
  z.object({ action: z.literal("linkReview"), orderId: z.string(), providerOrderId: z.string().trim().min(1, "Enter the provider order id.") }),
]);

export const POST = api(async (req) => {
  const admin = await apiAdmin();
  const input = schema.parse(await req.json());

  switch (input.action) {
    case "syncCatalog": {
      const result = await syncCatalog();
      return { message: `Imported ${result.imported} services. ${result.removed} no longer offered.` };
    }
    case "syncOrders": {
      const result = await syncOrders();
      return { message: result.skipped ? "A sync is already running." : `Checked ${result.checked} orders.` };
    }
    case "updateSettings": {
      await getSettings();
      await db.setting.update({ where: { id: 1 }, data: { defaultMargin: input.defaultMargin, currencyMultiplier: input.currencyMultiplier } });
      return { message: "Pricing saved." };
    }
    case "updateService": {
      const service = await db.service.findUnique({ where: { id: input.id } });
      if (!service) throw new ApiError(404, "Service not found.");
      if (input.enabled && !service.supported) throw new ApiError(400, "This service type is not supported by the order form.");
      await db.service.update({
        where: { id: input.id },
        data: {
          displayName: input.displayName || null,
          marginPercent: input.marginPercent,
          customPrice: input.customPriceRupees == null ? null : Math.round(input.customPriceRupees * 100),
          enabled: input.enabled,
        },
      });
      return { message: "Saved." };
    }
    case "setCategory": {
      const { count } = await db.service.updateMany({ where: { category: input.category, supported: true }, data: { enabled: input.enabled } });
      return { message: `${count} services updated.` };
    }
    case "enableAll": {
      const { count } = await db.service.updateMany({ where: { supported: true }, data: { enabled: true } });
      return { message: `${count} services enabled.` };
    }
    case "adjustBalance": {
      const paise = Math.round(input.rupees * 100);
      const note = `Admin ${admin.username}: ${input.note}`;
      await db.$transaction((tx) => (paise > 0 ? credit(tx, input.userId, paise, "ADJUST", note) : debit(tx, input.userId, -paise, "ADJUST", note)));
      return { message: "Balance updated." };
    }
    case "setBlocked": {
      if (input.userId === admin.id) throw new ApiError(400, "You cannot block your own account.");
      await db.user.update({ where: { id: input.userId }, data: { blocked: input.blocked } });
      return { message: input.blocked ? "User blocked." : "User unblocked." };
    }
    case "refundReview": {
      await resolveReview(input.orderId, { refund: true });
      return { message: "Order refunded." };
    }
    case "linkReview": {
      await resolveReview(input.orderId, { providerOrderId: input.providerOrderId });
      return { message: "Order linked." };
    }
  }
});
