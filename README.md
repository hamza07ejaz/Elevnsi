# ELEVNSI Website (v1)

A fast, static website for ELEVNSI: plain HTML, CSS and JavaScript with no build step and no framework. It can be hosted anywhere (Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any web host).

## What's included

| File | Purpose |
|---|---|
| `index.html` | Home page: hero, 3 services, why ELEVNSI, solutions detail, how it works, about, contact, footer |
| `privacy.html`, `terms.html` | Legal pages (**starting templates**, so have them reviewed before launch) |
| `assets/css/styles.css` | All styling (brand colours are at the top as CSS variables) |
| `assets/js/config.js` | **The only file you need to edit** to connect your services |
| `assets/js/main.js` | Menu, animations, system diagram, form handling, booking window, analytics events |
| `assets/js/store.js` | Data layer for leads and contact details |
| `assets/js/admin.js` | Admin panel (open `yoursite/#admin`) |
| `assets/img/` | Logo, favicon, social-share image |
| `robots.txt`, `sitemap.xml` | Basic SEO |

## Before going live: 4 things to connect

Open `assets/js/config.js` and fill in:

### 1. Leads → Netlify Forms (already switched on: `netlifyForms: true`)
Both forms (`contact` and `consultation-booking`) are set up for Netlify Forms.
1. Upload the site to Netlify (drag the folder onto your site's **Deploys** page).
2. In Netlify, open your site → **Forms**. If it asks, click **Enable form detection**, then upload the site once more.
3. Send a test inquiry from the live site and check it appears under **Forms**.
4. Email alerts: **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**, choose the form, enter your inbox.

A hidden spam trap is included (`netlify-honeypot`). Netlify's free plan includes 100 form submissions per month.
Prefer Formspree instead? Set `netlifyForms: false` and put your Formspree link in `contactFormEndpoint`.

**Changing contact details on Netlify:** edit the contact section at the top of `assets/js/config.js` (WhatsApp, phone, email, address, hours, social links) and upload again. Opening `yoursite/#admin` on Netlify shows these same instructions.

### 2. Consultation booking → team calendar + confirmation emails (`bookingUrl`)
Use **Calendly** (or Cal.com):
1. Create a "Free Consultation" event (30 min, video call).
2. Connect your team's Google or Outlook calendar so only free times are shown.
3. Turn on email confirmations and reminders for invitees, and notifications for your team.
4. Paste the event link (e.g. `https://calendly.com/elevnsi/consultation`) into `bookingUrl`.

Every "Book a Consultation" button then opens your live calendar inside the site. Until a link is set, the site shows a built-in date/time request form that sends requests to your form endpoint. That form does **not** check real availability, so connect Calendly before launch.

### 3. Google Analytics (`gaMeasurementId`)
Create a GA4 property, copy the Measurement ID (`G-XXXXXXXXXX`) into `gaMeasurementId`. The site also sends these events:
- `booking_open`: someone opened the booking window
- `generate_lead`: a contact form or booking request was submitted

Mark `generate_lead` as a key event (conversion) in GA4.
Depending on where your visitors are (e.g. EU/UK), you may need a cookie consent banner before analytics loads.

### 4. Domain and contact details
- Replace `https://www.elevnsi.com/` in `index.html`, `privacy.html`, `terms.html`, `robots.txt` and `sitemap.xml` if your domain is different.
- Check `email` and `linkedinUrl` in `config.js`. They're placeholders.

## Admin panel (`#admin`)
Shows every contact-form and booking lead (search, filter, status, delete, CSV export) and lets you edit the WhatsApp number, phone, email, address, hours and social links shown on the site.

- **When hosted as the Claude artifact:** leads and settings are saved in the artifact's shared database. Only the owner and editors can see leads.
- **On any other host:** `store.js` falls back to the visitor's own browser storage, so the admin panel only shows leads from that same browser. To collect leads from all visitors on your own host, set `contactFormEndpoint` (Formspree emails you every lead), or replace the functions in `store.js` with calls to a real database (e.g. Supabase or Firebase) **and protect the admin page with a login**.

## Previewing locally
Open `index.html` directly in a browser, or run a small local server from this folder:

```bash
npx http-server -p 5173
```

## Editing tips
- **Text:** edit `index.html` directly. Each section is labelled with a comment.
- **Colours:** change the variables at the top of `assets/css/styles.css` (`--green`, `--ink`, etc.).
- **Booking time slots** for the built-in fallback: `booking.times` and `booking.workDays` in `config.js`.

## Not included (by design, per requirements)
No customer accounts, dashboards, login, payments or public pricing.
