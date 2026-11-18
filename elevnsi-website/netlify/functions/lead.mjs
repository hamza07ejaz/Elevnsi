// POST /api/lead : save a contact-form lead or a consultation booking, then send emails
import {
  json, fail, readJson, siteUrl, env, leadsStore, bookingsStore, getContactSettings,
  clean, cleanText, isEmail, newId, bookableDates, slotKey, slotLabel
} from '../lib/core.mjs';
import { BOOKING } from '../lib/config.mjs';
import { sendMail, customerEmail, adminEmail, bookingIcs } from '../lib/mail.mjs';

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  const body = await readJson(req);
  if (!body) return fail(400, 'invalid_json', 'The request could not be read.');
  if (body._gotcha) return json({ ok: true }); // spam trap

  const source = body.source === 'booking' ? 'booking' : 'contact';
  const lead = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'new',
    source,
    full_name: clean(body.full_name, 120),
    business_name: clean(body.business_name, 160),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 40),
    service: clean(body.service, 80),
    message: cleanText(body.message, 4000),
    timezone: clean(body.timezone, 60)
  };

  const errors = {};
  if (!lead.full_name) errors.full_name = 'Please enter your name.';
  if (!lead.business_name) errors.business_name = 'Please enter your business name.';
  if (!isEmail(lead.email)) errors.email = 'Please enter a valid email address.';
  if (source === 'contact' && lead.message.length < 10) errors.message = 'Please add a short message.';

  let slot;
  if (source === 'booking') {
    const date = clean(body.date, 10);
    const time = clean(body.time, 5);
    if (!bookableDates().includes(date) || !BOOKING.times.includes(time)) {
      errors.slot = 'Please choose an available date and time.';
    } else {
      lead.date = date; lead.time = time; lead.slotLabel = slotLabel(date, time);
      slot = slotKey(date, time);
    }
  }
  if (Object.keys(errors).length) return json({ error: 'invalid', errors, message: Object.values(errors)[0] }, 422);

  // Reserve the slot (prevents double booking), then save the lead
  try {
    if (slot) {
      const bookings = bookingsStore();
      if (await bookings.get(slot)) return fail(409, 'slot_taken', 'Sorry, that time was just booked. Please choose another time.');
      await bookings.set(slot, lead.id);
    }
    await leadsStore().setJSON(`lead/${lead.id}`, lead);
  } catch (err) {
    console.error('[lead] storage error', err);
    return fail(500, 'storage_error', 'We couldn’t save your request just now. Please try again in a minute.');
  }

  // Emails: confirmation to the customer + notification to the team
  const url = siteUrl(req);
  const contact = await getContactSettings();
  const adminTo = env('ADMIN_EMAIL') || contact.email || env('SMTP_USER');
  const results = await Promise.allSettled([
    (async () => {
      const m = customerEmail(lead, url);
      return sendMail({ to: lead.email, ...m, replyTo: adminTo, ics: source === 'booking' ? bookingIcs(lead, url) : undefined });
    })(),
    (async () => {
      const m = adminEmail(lead, url);
      return sendMail({ to: adminTo, ...m, replyTo: lead.email });
    })()
  ]);
  results.forEach((r) => r.status === 'rejected' && console.error('[lead] email failed', r.reason));
  const customerEmailed = results[0].status === 'fulfilled' && results[0].value === true;

  return json({ ok: true, id: lead.id, slotLabel: lead.slotLabel, timeZoneLabel: BOOKING.timeZoneLabel, customerEmailed });
};

export const config = { path: '/api/lead' };
