# FameFirst

A prepaid SMM reseller site: customers top up a wallet and place orders that are forwarded to a Perfect Panel style provider (API v2).

## Run locally

```bash
npm install
cp .env.example .env      # set JWT_SECRET: openssl rand -hex 32
npx prisma db push
npm run dev
```

Sign up at http://localhost:3000, then make that account an admin and open `/admin/services`:

```bash
npm run make-admin -- you@example.com
```

Press **Import from provider**, then enable services. Only `Default` type services can be sold, because the order form collects a link and a quantity.

Without provider or Razorpay keys, development uses a test provider and test top-ups. Production refuses both. In test mode, a link containing `mock-cancel`, `mock-partial`, `mock-reject` or `mock-timeout` triggers that outcome.

## Go live

1. Set `PROVIDER_API_URL` (for example `https://provider.com/api/v2`) and `PROVIDER_API_KEY`.
2. In `/admin`, set the margin and the currency rate if the provider does not charge in INR.
3. Set Razorpay keys. Add a webhook at `APP_URL/api/webhooks/razorpay` for `payment.captured`, and put its secret in `RAZORPAY_WEBHOOK_SECRET`.
4. Set `APP_URL` to your https domain, the branding values, and SMTP for password resets.
5. Change the Prisma provider to `postgresql` and point `DATABASE_URL` at Postgres.
6. Review `/terms` with someone qualified. It is a starting draft.
7. Run `npm run build && npm start` on one server. For several instances, set `DISABLE_INTERNAL_CRON=true` and POST to `/api/cron/sync-orders` with `Authorization: Bearer CRON_SECRET` every few minutes.

Orders the provider never confirmed (for example a timeout) wait in `/admin/orders` until you link or refund them.
