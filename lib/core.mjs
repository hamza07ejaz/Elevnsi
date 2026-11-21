// Shared helpers for the ELEVNSI API (Vercel functions in /api)
import crypto from 'node:crypto';
import { BOOKING } from './config.mjs';
import { leadsStore, bookingsStore, siteStore, demoStore, callsStore, StorageError } from './db.mjs';
export { leadsStore, bookingsStore, siteStore, demoStore, callsStore, StorageError };

/* ---------- Settings: Admin → Integrations first, then Vercel environment variables ---------- */
// Keys that can be saved in the admin panel (encrypted in the database). Admin values win over Vercel ones.
// ADMIN_PASSWORD, SESSION_SECRET and the database connection must stay in Vercel: the panel needs them to start.
export const INTEGRATION_KEYS = [
  'VAPI_API_KEY', 'VAPI_WEBHOOK_SECRET', 'VAPI_MODEL', 'VAPI_PHONE_NUMBER_ID',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'DEFAULT_COUNTRY_CODE',
  'RESEND_API_KEY', 'MAIL_FROM', 'ADMIN_EMAIL', 'SITE_URL'
];
const overrides = (globalThis.__elevnsiIntegrations ||= { values: {}, at: 0, error: '' });

export const env = (key, fallback = '') => {
  const o = overrides.values[key];
  if (typeof o === 'string' && o !== '') return o;
  const v = process.env[key];
  return v === undefined || v === null || v === '' ? fallback : String(v);
};
/** Where a setting currently comes from: 'admin' | 'vercel' | '' */
export const settingSource = (key) => (overrides.values[key] ? 'admin' : process.env[key] ? 'vercel' : '');
export const adminValues = () => ({ ...overrides.values });
export const integrationsError = () => overrides.error;

// AES-256-GCM, key derived from SESSION_SECRET (or ADMIN_PASSWORD if that isn't set)
const boxKey = () => {
  const base = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return base ? crypto.createHash('sha256').update('elevnsi-integrations:' + base).digest() : null;
};
function seal(obj) {
  const key = boxKey();
  if (!key) throw new Error('Set ADMIN_PASSWORD (or SESSION_SECRET) in Vercel before saving keys.');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function unseal(box) {
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', boxKey(), Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8'));
  } catch { return null; }
}
/** Loads the admin-saved keys (cached for 10 seconds per server instance). */
export async function loadIntegrations(force = false) {
  if (!force && Date.now() - overrides.at < 10000) return;
  try {
    const box = await siteStore().get('integrations', { type: 'json' });
    const vals = box ? unseal(box) : {};
    overrides.values = vals || {};
    overrides.error = box && !vals ? 'unreadable' : '';
  } catch { /* database not reachable: keep what we had */ }
  overrides.at = Date.now();
}
export async function saveIntegrations(values) {
  const clean = Object.fromEntries(Object.entries(values).filter(([k, v]) => INTEGRATION_KEYS.includes(k) && typeof v === 'string' && v !== ''));
  await siteStore().setJSON('integrations', seal(clean));
  overrides.values = clean; overrides.at = Date.now(); overrides.error = '';
}

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
  try { await loadIntegrations(); return await fn(req); }
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

/** Signed value for cookies: "<data>.<signature>". Returns the data back from verifySigned, or null if tampered. */
export const signValue = (data) => `${data}.${sign(data)}`;
export function verifySigned(token) {
  if (!secret() || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const data = token.slice(0, i), sig = token.slice(i + 1), expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return data;
}
export const getCookie = (req, name) => {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(req.headers.get('cookie') || '');
  return m ? decodeURIComponent(m[1]) : null;
};

/* ---------- Private demo invites ---------- */
export const newInviteCode = () => crypto.randomBytes(18).toString('base64url'); // 24 characters, unguessable
export const validInviteCode = (c) => typeof c === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(c);
/** 'active' | 'expired' | 'revoked' | 'missing' */
export function inviteState(inv) {
  if (!inv) return 'missing';
  if (inv.revoked) return 'revoked';
  if (inv.expiresAt && Date.parse(inv.expiresAt) <= Date.now()) return 'expired';
  return 'active';
}

/* ---------- Validation ---------- */
export const clean = (v, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const cleanText = (v, max = 4000) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
export const newId = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

/* ---------- Booking calendar ---------- */
/** Minutes the time zone is ahead of UTC at a given moment (handles daylight saving). */
export function zoneOffsetMinutes(at = new Date(), timeZone = BOOKING.timeZone) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(at).map((x) => [x.type, x.value]));
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  } catch { return 0; }
}
/** "Now" in the business time zone; read it with getUTC*(). */
export const businessNow = () => new Date(Date.now() + zoneOffsetMinutes() * 60000);
/** Working dates customers can book (YYYY-MM-DD), starting tomorrow in the business time zone. */
export function bookableDates() {
  const nowLocal = businessNow();
  const d = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() + 1));
  const out = [];
  while (out.length < BOOKING.daysAhead) {
    if (BOOKING.workDays.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
/** Exact start time of a slot as a Date. */
export function slotStart(date, time, timeZone = BOOKING.timeZone) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const first = zoneOffsetMinutes(new Date(wall), timeZone);
  const off = zoneOffsetMinutes(new Date(wall - first * 60000), timeZone);
  return new Date(wall - off * 60000);
}
/** "Wednesday, December 2, 2026 at 11:00 AM" in the business time zone. */
export function slotLabel(date, time) {
  const [y, mo, da] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const day = new Date(Date.UTC(y, mo - 1, da)).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
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
