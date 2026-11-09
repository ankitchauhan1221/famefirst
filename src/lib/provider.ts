import { isProd } from "./config";

export type ProviderService = {
  service: string | number;
  name: string;
  type: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean;
  cancel?: boolean;
};

export type ProviderStatus = {
  status?: string;
  remains?: string | number;
  start_count?: string | number;
  error?: string;
};

/** The provider answered and refused the request, so nothing was placed. */
export class ProviderRejected extends Error {}

function credentials() {
  const url = process.env.PROVIDER_API_URL;
  const key = process.env.PROVIDER_API_KEY;
  if (url && key) return { url, key };
  if (isProd) throw new Error("PROVIDER_API_URL and PROVIDER_API_KEY must be set in production.");
  return null;
}

async function call<T>(creds: { url: string; key: string }, params: Record<string, string>): Promise<T> {
  const response = await fetch(creds.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: creds.key, ...params }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  const data = (await response.json()) as T & { error?: unknown };
  if (data && !Array.isArray(data) && typeof data.error === "string") throw new ProviderRejected(data.error);
  return data;
}

// Test provider used in development when no API key is set.
const MOCK_SERVICES: ProviderService[] = [
  { service: 101, name: "Instagram Followers", type: "Default", category: "Instagram Followers", rate: "120.00", min: 100, max: 50000, refill: true, cancel: true },
  { service: 102, name: "Instagram Followers - Refill 30 days", type: "Default", category: "Instagram Followers", rate: "180.00", min: 100, max: 20000, refill: true, cancel: true },
  { service: 201, name: "Instagram Likes", type: "Default", category: "Instagram Likes", rate: "25.00", min: 50, max: 50000, cancel: true },
  { service: 202, name: "Instagram Likes - Fast start", type: "Default", category: "Instagram Likes", rate: "40.00", min: 50, max: 20000, cancel: true },
  { service: 301, name: "Instagram Reel Views", type: "Default", category: "Instagram Views", rate: "6.50", min: 500, max: 1000000 },
  { service: 401, name: "Instagram Custom Comments", type: "Custom Comments", category: "Instagram Comments", rate: "400.00", min: 10, max: 500 },
];

function mockStatus(id: string): ProviderStatus {
  const age = Date.now() - Number(id.slice(0, -1));
  const flag = id.at(-1);
  if (flag === "1") return { status: "Canceled", remains: 0, start_count: 1000 };
  if (flag === "2") return { status: "Partial", remains: 100, start_count: 1000 };
  if (age < 20_000) return { status: "Pending", remains: 0, start_count: 0 };
  if (age < 60_000) return { status: "In progress", remains: 50, start_count: 1000 };
  return { status: "Completed", remains: 0, start_count: 1000 };
}

export const provider = {
  isTestMode: () => credentials() === null,

  async services(): Promise<ProviderService[]> {
    const creds = credentials();
    return creds ? call<ProviderService[]>(creds, { action: "services" }) : MOCK_SERVICES;
  },

  async addOrder(input: { service: string; link: string; quantity: number }): Promise<string> {
    const creds = credentials();
    if (!creds) {
      if (input.link.includes("mock-reject")) throw new ProviderRejected("Test provider rejected this link.");
      if (input.link.includes("mock-timeout")) throw new Error("Test provider timed out.");
      const flag = input.link.includes("mock-cancel") ? "1" : input.link.includes("mock-partial") ? "2" : "0";
      return `${Date.now()}${flag}`;
    }
    const data = await call<{ order?: string | number }>(creds, {
      action: "add",
      service: input.service,
      link: input.link,
      quantity: String(input.quantity),
    });
    if (data.order === undefined) throw new Error("Provider response had no order id.");
    return String(data.order);
  },

  async statuses(ids: string[]): Promise<Record<string, ProviderStatus>> {
    const creds = credentials();
    if (!creds) return Object.fromEntries(ids.map((id) => [id, mockStatus(id)]));
    return call<Record<string, ProviderStatus>>(creds, { action: "status", orders: ids.join(",") });
  },

  async balance(): Promise<{ balance: string; currency: string }> {
    const creds = credentials();
    return creds ? call(creds, { action: "balance" }) : { balance: "999999.00", currency: "TEST" };
  },
};
