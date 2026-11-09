export const isProd = process.env.NODE_ENV === "production";

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "FameFirst",
  businessName: process.env.BUSINESS_NAME || "[Your registered business name]",
  supportEmail: process.env.SUPPORT_EMAIL || "[your support email]",
};

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const razorpayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const TOPUP_MIN_RUPEES = 10;
export const TOPUP_MAX_RUPEES = 50_000;
