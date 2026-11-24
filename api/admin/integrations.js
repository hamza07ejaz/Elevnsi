// /api/admin/integrations (admin only): API keys saved in the admin panel instead of Vercel
//   GET                                   which keys are set, where from, masked previews (secrets never leave the server)
//   PUT  {values: {KEY: 'new value'}, clear: ['KEY']}   save new values / remove admin values (falls back to Vercel)
//   POST {action: 'test', service: 'vapi' | 'twilio' | 'vonage' | 'resend'}   check the saved keys work
import crypto from 'node:crypto';
import {
  json, fail, readJson, route, isAdmin, env, isEmail, INTEGRATION_KEYS, settingSource, adminValues,
  integrationsError, saveIntegrations, loadIntegrations
} from '../../lib/core.mjs';
import { toE164, vapi } from '../../lib/voice.mjs';

const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
const SECRET = ['VAPI_API_KEY', 'VAPI_WEBHOOK_SECRET', 'TWILIO_AUTH_TOKEN', 'VONAGE_API_SECRET', 'RESEND_API_KEY'];

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
  if (/\s/.test(v) && !['MAIL_FROM', 'TWILIO_PHONE_NUMBER', 'VONAGE_PHONE_NUMBER'].includes(key)) bad(`${key} can't contain spaces. Check you copied only the key.`);
  switch (key) {
    case 'PHONE_PROVIDER': return ['twilio', 'vonage'].includes(v) ? v : bad('Choose Twilio or Vonage.');
    case 'VONAGE_PHONE_NUMBER': return toE164(v) || bad('Vonage number must include the country code, e.g. +14165550199.');
    case 'VONAGE_API_KEY': return /^[a-z0-9]{6,32}$/i.test(v) ? v : bad('Vonage API key is the short code (letters and numbers) at the top of the Vonage dashboard.');
    case 'VONAGE_API_SECRET': return v.length >= 6 && v.length <= 128 ? v : bad('Vonage API secret looks too short.');
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
      // Is the phone number really in this Twilio account? ("Number Not Found on Twilio" otherwise)
      const num = toE164(env('TWILIO_PHONE_NUMBER'));
      let numberNote = ' Add your Twilio phone number too.';
      if (num) {
        const nr = await fetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(num)}`, { headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') } });
        const list = nr.ok ? (await nr.json().catch(() => ({}))).incoming_phone_numbers || [] : null;
        if (list && !list.length) return done(false, `Twilio keys work, but ${num} is not a number in this Twilio account. Check Phone Numbers → Active numbers and copy that number exactly.`);
        numberNote = list ? ` ${num} found in your account.` : '';
      }
      return done(true, `Twilio works: ${acct.friendly_name || 'account found'}.${numberNote}${trial ? ' It is a trial account: upgrade it so the AI can call any number without the trial message.' : ''}`);
    }
    if (body.service === 'vonage') {
      const key = env('VONAGE_API_KEY'), secret = env('VONAGE_API_SECRET');
      if (!key || !secret) return done(false, 'Add your Vonage API key and API secret first.');
      const base = env('VONAGE_API_BASE', 'https://rest.nexmo.com').replace(/\/$/, '');
      const auth = `api_key=${encodeURIComponent(key)}&api_secret=${encodeURIComponent(secret)}`;
      const res = await fetch(`${base}/account/get-balance?${auth}`);
      if (res.status === 401 || res.status === 403) return done(false, 'Vonage rejected the API key or secret. Copy them again from the top of the Vonage dashboard (API Settings).');
      if (!res.ok) return done(false, `Vonage replied with error ${res.status}.`);
      const bal = await res.json().catch(() => ({}));
      const balance = typeof bal.value === 'number' ? ` Balance: ${bal.value.toFixed(2)}.` : '';
      const low = typeof bal.value === 'number' && bal.value < 1 ? ' Your balance is low: add credit so calls can connect.' : '';
      const num = toE164(env('VONAGE_PHONE_NUMBER'));
      if (!num) return done(true, `Vonage keys work.${balance} Now add your Vonage phone number.${low}`);
      const nr = await fetch(`${base}/account/numbers?${auth}&pattern=${num.slice(1)}&search_pattern=0`);
      const data = nr.ok ? await nr.json().catch(() => ({})) : null;
      const found = data && (data.numbers || []).find((x) => String(x.msisdn) === num.slice(1));
      if (data && !found) return done(false, `Vonage keys work, but ${num} is not a number in this Vonage account. Check Numbers → Your numbers and copy it exactly.`);
      const voice = !found || !Array.isArray(found.features) || found.features.includes('VOICE');
      if (!voice) return done(false, `${num} is in your Vonage account but can't take voice calls. Buy a number with Voice.`);
      return done(true, `Vonage works.${balance} ${num} found in your account.${low}`);
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

