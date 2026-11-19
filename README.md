# ELEVNSI Website (v3: Vercel)

A fast website for ELEVNSI plus a small backend on Vercel:

- **Leads & bookings saved** in Upstash Redis (free plan, added from the Vercel dashboard).
- **Automatic emails:** the customer gets a confirmation (bookings include a calendar invite); you get a notification for every lead.
- **Real booking calendar:** booked times are blocked; even two people clicking at the same moment can't double-book.
- **Password-protected admin panel** at `yoursite/#admin`: leads, statuses, export, and editing the contact details shown on the site (WhatsApp, phone, email, address, hours, social links).
- **Private console demo** at `yoursite/demo/`, for invited people only. In the admin panel → **Demo access**, create a personal link for each person (it can expire after 1–30 days), copy it or send it by WhatsApp/email, see when they opened it, and switch it off at any time. You get an email the first time each person opens their link. Anyone without a valid link sees a "This demo is private" page.

## Folder structure

```
public/                ← the website (HTML, CSS, JS, images)
  assets/js/config.js  ← default contact details & options
api/                   ← backend routes (Vercel Functions)
  lead.js              POST /api/lead
  slots.js             GET  /api/slots
  settings.js          GET/PUT /api/settings
  admin/login.js       POST /api/admin/login
  admin/leads.js       GET/PATCH/DELETE /api/admin/leads
  admin/demo.js        GET/POST/PATCH/DELETE /api/admin/demo (demo invite links)
  demo.js              serves /demo/ to people with a valid invite
private/demo/          ← the console demo (not public; served only through api/demo.js)
lib/
  config.mjs           ← booking hours, time zone, meeting length
  mail.mjs             ← email templates
  db.mjs               ← Upstash Redis storage
  core.mjs             ← shared helpers (auth, validation)
vercel.json            ← tells Vercel to publish public/
package.json
```

## Setup (one time, about 15 minutes)

### 1. Put the project on Vercel
**Option A: GitHub (recommended, auto-deploys on every change)**
1. Create a GitHub repository and upload this folder (everything except `node_modules`).
2. Vercel → **Add New… → Project** → import the repository.
3. Framework preset: **Other**. Leave build settings empty (`vercel.json` handles it) → **Deploy**.

**Option B: Vercel CLI (from this folder)**
```bash
npm install
npx vercel login
npx vercel
```
Answer the questions (new project, name e.g. `elevnsi`). This creates a preview deployment.

### 2. Add the database (Upstash Redis)
Vercel → your project → **Storage** → **Create Database** → **Upstash for Redis** (free plan) → create → **Connect to project**.
This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your project automatically.

### 3. Create a Gmail App Password (for sending emails)
1. Turn on 2-Step Verification: https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords → name it "ELEVNSI website" → copy the 16-letter password.

(Prefer Resend? Set `RESEND_API_KEY` and `MAIL_FROM` instead of the SMTP variables. Resend needs your own domain verified to email customers.)

### 4. Add environment variables
Vercel → your project → **Settings → Environment Variables** (apply to Production and Preview):

| Key | Value |
|---|---|
| `ADMIN_PASSWORD` | the password you want for the admin panel (long and unique) |
| `ADMIN_EMAIL` | where new-lead notifications go, e.g. `you@gmail.com` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | the 16-letter App Password from step 3 |
| `MAIL_FROM` | optional, e.g. `ELEVNSI <you@gmail.com>` |
| `SESSION_SECRET` | optional: any long random text (keeps admin sign-ins valid when you change the password) |
| `SITE_URL` | optional: your final address, e.g. `https://elevnsi.com` (used for links in emails) |

### 5. Redeploy
Environment variables apply to new deployments only:
Vercel → **Deployments** → latest → **⋯ → Redeploy** (or run `npx vercel --prod`).

### 6. Test it
1. Open your site and book a consultation with your own email → you should get the confirmation (check spam the first time), and `ADMIN_EMAIL` gets the notification.
2. Open `yoursite/#admin`, sign in with `ADMIN_PASSWORD` → the booking is listed.
3. In **Contact details**, add your WhatsApp number → the green WhatsApp button appears on the site.

### Custom domain
Vercel → your project → **Settings → Domains** → add `elevnsi.com` and follow the DNS steps. Then set `SITE_URL` and update the domain in `public/sitemap.xml`, `public/robots.txt` and the `<head>` of `public/index.html`.

## Everyday use
- **Admin panel:** `https://yoursite/#admin` (not linked publicly). Sign-in lasts 12 hours.
- **Booking hours / time zone / meeting length:** `lib/config.mjs`, then deploy again.
- **Email wording:** `lib/mail.mjs`.
- **Change the admin password:** update `ADMIN_PASSWORD` in Vercel and redeploy.
- Deleting a booking in the admin panel frees that time slot again.
- **Showing the demo to someone:** admin panel → **Demo access** → enter their name → **Create link** → send it. Switching a link off blocks it immediately, even for someone who already has the demo open (on their next page load).
- Set `SESSION_SECRET` so demo visitors stay signed in when you change the admin password.

## Local development
```bash
npm install
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```
Opens http://localhost:3000 with the backend running. Without Redis variables it uses temporary in-memory storage; without email variables, emails are skipped and logged in the terminal.
Opening `public/index.html` directly runs a **preview mode** where leads are saved in that browser only.

## Notes
- Upstash's free plan and Vercel's Hobby plan are enough for a site this size. Vercel's Hobby plan is for non-commercial use; for a business site, Vercel recommends the Pro plan.
- The privacy and terms pages are templates. Have them reviewed before launch.
- No public pricing, customer accounts or payments, as per the requirements.
