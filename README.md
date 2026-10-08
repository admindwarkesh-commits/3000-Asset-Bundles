# 3000-Asset-Bundles

Mobile Next.js store for the presets pack. Buyers pay with Razorpay and get a download link by email. The admin panel is at `/admin`.

## Run the site

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin login is at [http://localhost:3000/admin](http://localhost:3000/admin).

## Secrets

Copy `.env.example` to `.env.local` and fill in your own values. `.env.local` stays on your machine and is not committed.

Required:

- `MONGODB_URI`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Optional Razorpay and SMTP fallbacks (the admin panel can store keys too):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
