type PricedService = { providerRate: number; marginPercent: number | null; customPrice: number | null };
type PriceSettings = { defaultMargin: number; currencyMultiplier: number };

/** Selling price in paise for 1000 units. */
export function pricePer1000(service: PricedService, settings: PriceSettings) {
  if (service.customPrice != null) return service.customPrice;
  const margin = service.marginPercent ?? settings.defaultMargin;
  return Math.ceil(service.providerRate * settings.currencyMultiplier * 100 * (1 + margin / 100));
}

export function chargeFor(price: number, quantity: number) {
  return Math.ceil((price * quantity) / 1000);
}

export function inr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
}
