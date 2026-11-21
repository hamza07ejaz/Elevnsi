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
  admin/calls.js       AI phone agent: settings, call log, connect number, call now
  voice/webhook.js     POST /api/voice/webhook (Vapi calls this during every phone call)
  voice/recording.js   GET  /api/voice/recording (plays private call recordings in the admin panel)
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

## AI phone agent (Vapi + Twilio)

Your AI answers your business number 24/7 and can call people back. On a call it can answer questions from your business information, ask your qualifying questions, check free times and book the consultation (same calendar and emails as the website), transfer to your phone, and hang up politely. After each call, the admin panel has the recording, transcript, summary, outcome and cost, and you get a summary email. Callers who qualify appear in **Leads** as "AI call", and bookings as "Booked by AI call".

### Setup (about 20 minutes)
1. **Vapi account:** sign up at https://vapi.ai → Dashboard → **API Keys** → copy the **Private** key.
2. **Twilio account and number:** sign up at https://www.twilio.com → **upgrade** the account (trial accounts can only call your own verified numbers and play a trial message) → **Phone Numbers → Buy a number** with **Voice** (e.g. a Canadian or US number, about $1–2/month). On the Console home page, copy the **Account SID** and **Auth Token**.
   If you will call other countries: Twilio → Voice → Settings → **Geo permissions** → tick those countries.
3. Open `yoursite/#admin` → **Integrations** and paste:
   - **Vapi:** the private API key (optionally pick the AI model: Haiku 5.5 is fastest and cheapest, Sonnet is smarter but slower).
   - **Twilio:** Account SID, Auth Token and the phone number you bought (e.g. `+14165550199`).
   - **Website:** your exact live address, e.g. `https://www.elevnsi.com` (with `www` if your site redirects to it). **Required for calls:** Vapi sends call events here, and they fail if this address redirects.
   - Press **Save** and **Test connection** on each card. No redeploy needed. The webhook secret is created automatically.
4. Go to **AI Calls** → **Connect phone number**. This adds your Twilio number to Vapi and points it at your site.
5. Call your number from your mobile. The AI answers. Or type your own number in **Call someone now** and press **Test call to my phone**.
6. Adjust **Agent settings** (name, voice, greetings, business information, qualifying questions, transfer number, calling hours), then **Save**. The next call uses them.

### Calling website leads back automatically
Turn on **Call new website leads back** in Agent settings. When someone sends the contact form with a phone number and ticks **"Call me back now"**, the AI calls them within seconds, but only inside your calling hours and days (in the time zone set in `lib/config.mjs`). Outside those hours, the lead is saved as usual and your team calls back.

### Costs (estimates)
- Vapi: roughly $0.10–0.15 per minute all-in (speech recognition, AI model, voice, platform). See vapi.ai/pricing.
- Twilio: number about $1–2/month plus about $0.01–0.02 per minute in Canada/US.
- Each call's cost shows in the call log when Vapi reports it.

### Rules for AI calling (please read)
- **Outgoing AI calls need the person's prior consent.** In the US, AI voices count as "artificial voice" under the TCPA, and Canada's CRTC rules are similar. The website only calls people who tick the consent box, and **Call someone now** asks you to confirm consent each time. Don't call purchased lists.
- **Recording:** the default greetings say "this call may be recorded". Keep that line if recording is on.
- Respect do-not-call requests: the AI notes them in the call summary. Remove those people from any lists.
- Keep calling hours reasonable for the person's time zone.

### If something doesn't work
- **Connect fails:** in **Integrations**, press **Test connection** on the Vapi and Twilio cards and fix what they report. The error from Vapi is also shown under the Connect button.
- **The number rings but the AI doesn't answer / calls don't appear in the log:** check **Integrations → Website** is your exact live address (open that address + `/api/voice/webhook` in a browser: it should say "Method Not Allowed" or show an error in JSON, not a 404 or redirect), then press **Reconnect number**.
- **Outgoing calls fail to other countries:** enable that country in Twilio's Geo permissions.

## API keys in the admin panel (Integrations)
`yoursite/#admin` → **Integrations** holds the keys for Vapi, Twilio, Resend (email), the email sender/notification address, and your live website address.
- Values are **encrypted** (AES-256) in your Upstash database and never shown again in full: you'll see `••••last4`.
- They work within seconds, no redeploy. A value saved here **overrides** the same variable in Vercel; **Remove saved value** goes back to the Vercel one.
- These stay in Vercel because the panel needs them to start: `ADMIN_PASSWORD`, `SESSION_SECRET`, and the database (`KV_REST_API_URL`/`KV_REST_API_TOKEN`). Saved keys are encrypted with `SESSION_SECRET` (or `ADMIN_PASSWORD` if not set), so **set `SESSION_SECRET` once** and you can change the admin password freely; otherwise changing the password means re-entering the keys.

## Everyday use
- **Admin panel:** `https://yoursite/#admin` (not linked publicly). Sign-in lasts 12 hours.
- **Booking hours / time zone / meeting length:** `lib/config.mjs`, then deploy again. Bookings use **US Eastern Time** (`America/New_York`, daylight saving handled automatically). Visitors in other countries also see the time in their own zone on the booking form and in their confirmation email.
- **Email icon:** emails show the ELEVNSI icon (`public/assets/img/elevnsi-icon-192.png`), loaded from your live `SITE_URL`. The round picture next to the sender name in Gmail/Outlook is set by the mail provider, not the email: if you send with Gmail, set the Google account's profile photo; if you send with Resend from your domain, create a free Gravatar (gravatar.com) for the sender address and upload `public/assets/img/elevnsi-icon-512.png`.
- **Call recordings:** Vapi keeps recordings private, so the admin panel plays them through `/api/voice/recording` with a signed link that lasts 6 hours (reload the panel after that). Your Vapi key never reaches the browser.
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
