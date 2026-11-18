/*
 * ELEVNSI site configuration
 * ---------------------------------------------------------------
 * Contact details below are DEFAULTS. Once the site is live you can change
 * them any time in the Admin panel (yoursite/#admin → Contact details).
 */
window.ELEVNSI_CONFIG = {
  /* ---------- Backend ---------- */
  // "server" = use the site's own backend (/api on Vercel): leads saved in
  // Upstash Redis, emails to customers and your team, password-protected admin.
  backend: "server",
  apiBase: "/api",

  /* ---------- Default contact details ---------- */
  email: "hello@elevnsi.com",
  whatsapp: "",            // with country code, e.g. "+92 300 1234567" (shows the WhatsApp button)
  whatsappMessage: "Hi ELEVNSI, I'd like to learn more about your AI automation solutions.",
  phone: "",
  address: "",
  hours: "",
  linkedinUrl: "https://www.linkedin.com/company/elevnsi",
  instagram: "",
  facebook: "",

  /* ---------- Booking ---------- */
  // Optional: a Calendly / Cal.com link replaces the built-in booking calendar.
  bookingUrl: "",
  // Preview-only calendar (when the backend isn't running). Live slots come
  // from lib/config.mjs.
  booking: {
    daysAhead: 10,
    times: ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"],
    workDays: [1, 2, 3, 4, 5]
  },

  /* ---------- Optional ---------- */
  contactFormEndpoint: "",   // e.g. Formspree, only used when the backend isn't running
  gaMeasurementId: ""        // Google Analytics 4, e.g. "G-ABC123XYZ9"
};
