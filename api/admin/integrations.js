// /api/admin/integrations (admin only): API keys saved in the admin panel instead of Vercel
//   GET                                   which keys are set, where from, masked previews (secrets never leave the server)
//   PUT  {values: {KEY: 'new value'}, clear: ['KEY']}   save new values / remove admin values (falls back to Vercel)
//   POST {action: 'test', service: 'vapi' | 'twilio' | 'resend'}   check the saved keys work
import crypto from 'node:crypto';
import {
  json, fail, readJson, route, isAdmin, env, isEmail, INTEGRATION_KEYS, settingSource, adminValues,
  integrationsError, saveIntegrations, loadIntegrations
} from '../../lib/core.mjs';
import { toE164, vapi } from '../../lib/voice.mjs';

const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
const SECRET = ['VAPI_API_KEY', 'VAPI_WEBHOOK_SECRET', 'TWILIO_AUTH_TOKEN', 'RESEND_API_KEY'];

const guard = (fn) => route(async (req) => (isAdmin(req) ? fn(req) : fail(401, 'unauthorized', 'Please sign in again.')));
const mask = (key, v) => (!v ? '' : SECRET.includes(key) ? `••••${v.slice(-4)}` : v);

function status(req) {
  const fields = Object.fromEntries(INTEGRATION_KEYS.map((k) => [k, { source: settingSource(k), preview: mask(k, env(k)) }]));
  return { fields, models: MODELS, unreadable: integrationsError() === 'unreadable', suggestedSiteUrl: new URL(req.url).origin };
}

/** Checks one value; returns the cleaned value or throws a friendly message. */
function check(key, raw) {
  const v = String(raw ?? '').trim();
  const bad = (m) => { throw Object.assign(new Error(m), { code: 'invalid' }); };
  if (/\s/.test(v) && !['MAIL_FROM', 'TWILIO_PHONE_NUMBER'].includes(key)) bad(`${key} can't contain spaces. Check you copied only the key.`);
  switch (key) {
    case 'SITE_URL':
      if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(v.replace(/\/$/, ''))) bad('Website address must look like https://www.elevnsi.com (no path).');
      return v.replace(/\/$/, '');
    case 'TWILIO_PHONE_NUMBER': return toE164(v) || bad('Twilio number must include the country code, e.g. +14165550199.');
    case 'TWILIO_ACCOUNT_SID': return /^AC[a-f0-9]{32}$/i.test(v) ? v : bad('Account SID starts with AC followed by 32 letters and numbers.');
    case 'DEFAULT_COUNTRY_CODE': return /^\+?\d{1,4}$/.test(v) ? v.replace('+', '') : bad('Country code is 1 to 4 digits, e.g. 1 or 92.');
    case 'VAPI_MODEL': return MODELS.includes(v) ? v : bad('Choose a model from the list.');
    case 'ADMIN_EMAIL': return isEmail(v) ? v : bad('Enter a valid email for notifications.');
    case 'MAIL_FROM': return /<[^\s@]+@[^\s@]+\.[^\s@]+>$|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : bad('Sender must be an email, or Name <email@yourdomain.com>.');
    case 'RESEND_API_KEY': return v.startsWith('re_') ? v : bad('Resend keys start with re_.');
    default: return v.length >= 8 && v.length <= 400 ? v : bad(`${key} looks too short.`);
  }
}

export const GET = guard(async (req) => {
  await loadIntegrations(true);
  return json(status(req));
});

export const PUT = guard(async (req) => {
  const body = await readJson(req);
  if (!body) return fail(400, 'invalid', 'Nothing to save.');
  await loadIntegrations(true);
  const next = integrationsError() === 'unreadable' ? {} : adminValues();
  try {
    for (const [k, v] of Object.entries(body.values || {})) {
      if (!INTEGRATION_KEYS.includes(k) || k === 'VAPI_WEBHOOK_SECRET') continue;
      if (String(v ?? '').trim() === '') continue; // empty = keep what's there
      next[k] = check(k, v);
    }
  } catch (err) { return fail(422, 'invalid', err.message); }
  for (const k of body.clear || []) if (INTEGRATION_KEYS.includes(k) && k !== 'VAPI_WEBHOOK_SECRET') delete next[k];
  // Vapi signs its requests with this secret; create one automatically (it only travels between Vapi and this site)
  if ((next.VAPI_API_KEY || env('VAPI_API_KEY')) && !next.VAPI_WEBHOOK_SECRET && !process.env.VAPI_WEBHOOK_SECRET) {
    next.VAPI_WEBHOOK_SECRET = crypto.randomBytes(32).toString('base64url');
  }
  await saveIntegrations(next);
  return json({ ok: true, ...status(req) });
});

export const POST = guard(async (req) => {
  const body = (await readJson(req)) || {};
  if (body.action !== 'test') return fail(400, 'invalid', 'Unknown action.');
  const done = (ok, message) => json({ ok, message });
  try {
    if (body.service === 'vapi') {
      if (!env('VAPI_API_KEY')) return done(false, 'Add your Vapi private key first.');
      const nums = await vapi('/phone-number');
      const n = Array.isArray(nums) ? nums.length : 0;
      return done(true, `Vapi key works. ${n} phone number${n === 1 ? '' : 's'} in your Vapi account.`);
    }
    if (body.service === 'twilio') {
      const sid = env('TWILIO_ACCOUNT_SID'), token = env('TWILIO_AUTH_TOKEN');
      if (!sid || !token) return done(false, 'Add your Twilio Account SID and Auth Token first.');
      const base = env('TWILIO_API_BASE', 'https://api.twilio.com').replace(/\/$/, '');
      const res = await fetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, { headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') } });
      if (res.status === 401) return done(false, 'Twilio rejected the Account SID or Auth Token. Copy them again from the Twilio Console home page.');
      if (!res.ok) return done(false, `Twilio replied with error ${res.status}.`);
      const acct = await res.json().catch(() => ({}));
      const trial = acct.type === 'Trial';
      return done(true, `Twilio works: ${acct.friendly_name || 'account found'}${trial ? '. It is a trial account: upgrade it so the AI can call any number without the trial message.' : '.'}`);
    }
    if (body.service === 'resend') {
      if (!env('RESEND_API_KEY')) return done(false, 'Add your Resend API key first.');
      const base = env('RESEND_API_BASE', 'https://api.resend.com').replace(/\/$/, '');
      const res = await fetch(`${base}/domains`, { headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}` } });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const verified = (data.data || []).filter((d) => d.status === 'verified').map((d) => d.name);
        return done(true, verified.length ? `Resend works. Verified domain: ${verified.join(', ')}.` : 'Resend key works, but no verified domain yet. Verify your domain in Resend so emails reach customers.');
      }
      if (data.name === 'restricted_api_key') return done(true, 'Resend key works (sending-only key).');
      return done(false, 'Resend rejected this key. Create a new API key in Resend and paste it again.');
    }
    return fail(400, 'invalid', 'Unknown service.');
  } catch (err) {
    return done(false, err.message || 'The test could not run. Please try again.');
  }
});

