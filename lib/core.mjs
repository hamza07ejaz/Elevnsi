// Shared helpers for the ELEVNSI API (Vercel functions in /api)
import crypto from 'node:crypto';
import { BOOKING } from './config.mjs';
import { leadsStore, bookingsStore, siteStore, StorageError } from './db.mjs';
export { leadsStore, bookingsStore, siteStore, StorageError };

export const env = (key, fallback = '') => {
  const v = process.env[key];
  return v === undefined || v === null || v === '' ? fallback : String(v);
};

/* ---------- HTTP ---------- */
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
export const fail = (status, error, message) => json({ error, message }, status);
export async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}
export const siteUrl = (req) => {
  const prod = env('VERCEL_PROJECT_PRODUCTION_URL');
  return (env('SITE_URL') || (prod ? `https://${prod}` : '') || new URL(req.url).origin).replace(/\/$/, '');
};

/** Wraps a handler so storage problems return a clear JSON error instead of a crash. */
export const route = (fn) => async (req) => {
  try { return await fn(req); }
  catch (err) {
    console.error('[api]', err);
    if (err instanceof StorageError) return fail(503, 'storage_error', 'The service is temporarily unavailable. Please try again in a minute.');
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
};

export async function getContactSettings() {
  try { return (await siteStore().get('contact', { type: 'json' })) || {}; } catch { return {}; }
}

/* ---------- Admin auth ---------- */
const secret = () => env('SESSION_SECRET') || env('ADMIN_PASSWORD');
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

export function checkPassword(password) {
  const real = env('ADMIN_PASSWORD');
  if (!real) return false;
  return crypto.timingSafeEqual(sha(password), sha(real));
}
export function makeToken(hours = 12) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + hours * 3600e3 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function isAdmin(req) {
  if (!secret()) return false;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

/* ---------- Validation ---------- */
export const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const cleanText = (v, max = 4000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
export const newId = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

/* ---------- Booking calendar ---------- */
const offsetMinutes = () => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(BOOKING.utcOffset) || ['', '+', '00', '00'];
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
};
/** Working dates customers can book (YYYY-MM-DD), starting tomorrow in the business time zone. */
export function bookableDates() {
  const nowLocal = new Date(Date.now() + offsetMinutes() * 60000);
  const d = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() + 1));
  const out = [];
  while (out.length < BOOKING.daysAhead) {
    if (BOOKING.workDays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
/** Exact start time of a slot as a Date. */
export const slotStart = (date, time) => new Date(`${date}T${time}:00${BOOKING.utcOffset}`);
/** "Thursday, 19 November 2026 at 10:00 AM" in the business time zone. */
export function slotLabel(date, time) {
  const [y, mo, da] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const day = new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const t = `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${day} at ${t}`;
}
// Storage key for a booked slot, e.g. "slot/2026-11-19_10-00" (no ":" so it is safe everywhere)
export const slotKey = (date, time) => `slot/${date}_${time.replace(':', '-')}`;
/** "slot/2026-11-19_10-00" -> "2026-11-19T10:00" */
export const slotFromKey = (key) => {
  const m = /^slot\/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})$/.exec(key);
  return m ? `${m[1]}T${m[2]}:${m[3]}` : null;
};
