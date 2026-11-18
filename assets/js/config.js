/*
 * ELEVNSI site configuration
 * ---------------------------------------------------------------
 * Edit this file, then upload the site to Netlify again.
 * Leave a value empty ("") to hide it on the website.
 * See README.md for step-by-step setup.
 */
window.ELEVNSI_CONFIG = {
  /* ---------- Your contact details (shown on the website) ---------- */
  email: "hello@elevnsi.com",
  whatsapp: "",            // with country code, e.g. "+92 300 1234567" (shows the WhatsApp button)
  whatsappMessage: "Hi ELEVNSI, I'd like to learn more about your AI automation solutions.",
  phone: "",               // e.g. "+92 300 1234567"
  address: "",             // e.g. "Lahore, Pakistan"
  hours: "",               // e.g. "Mon–Fri, 9:00 AM – 6:00 PM"
  linkedinUrl: "https://www.linkedin.com/company/elevnsi",
  instagram: "",           // full link, e.g. "https://instagram.com/elevnsi"
  facebook: "",            // full link, e.g. "https://facebook.com/elevnsi"

  /* ---------- Leads ---------- */
  // Netlify Forms: every contact form and booking appears in your Netlify
  // dashboard (Site > Forms), and Netlify can email each one to you.
  netlifyForms: true,

  // Optional alternative to Netlify Forms (e.g. Formspree "https://formspree.io/f/xxxx").
  // Only used when netlifyForms is false.
  contactFormEndpoint: "",

  /* ---------- Booking ---------- */
  // Calendly / Cal.com link. When set, "Book a Consultation" shows your live
  // calendar (real availability, calendar sync, confirmation emails).
  bookingUrl: "",

  // Built-in booking request form, used while bookingUrl is empty.
  booking: {
    daysAhead: 10,                 // how many business days to show
    times: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
    workDays: [1, 2, 3, 4, 5]      // 0 = Sun … 6 = Sat
  },

  /* ---------- Analytics ---------- */
  // Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ9"
  gaMeasurementId: ""
};
