// AI phone agent (Vapi + Twilio): settings, the agent's instructions and tools, the Vapi API client,
// and the actions the agent can take during a call (check times, book, save lead details).
import crypto from 'node:crypto';
import { BOOKING, BUSINESS } from './config.mjs';
import {
  env, siteStore, leadsStore, bookingsStore, callsStore, newId, clean, cleanText, isEmail,
  bookableDates, slotKey, slotLabel, slotStart, businessNow, signValue, siteUrl as getSiteUrl
} from './core.mjs';

/** Signed player link for a call recording, valid for 6 hours (checked by api/voice/recording.js). */
export const recordingLink = (callId) => `/api/voice/recording?t=${encodeURIComponent(signValue(`rec:${callId}:${Date.now() + 6 * 3600000}`))}`;

/* ---------- Settings (edited in Admin → AI Calls) ---------- */
export const VOICES = ['Elliot', 'Savannah', 'Clara', 'Emma', 'Leah', 'Jess', 'Mia', 'Tara', 'Zoe', 'Layla', 'Kai', 'Rohan', 'Neil', 'Zac', 'Dan', 'Leo', 'Nico', 'Godfrey'];

export const VOICE_DEFAULTS = {
  agentName: 'Alex',
  voiceId: 'Elliot',
  greeting: `Hi, thanks for calling ${BUSINESS.name}! This is {{agent}}, the AI assistant. This call may be recorded. How can I help you today?`,
  outboundGreeting: `Hi {{name}}, this is {{agent}}, the AI assistant from ${BUSINESS.name}, calling about {{reason}}. This call may be recorded. Is now a good time for a quick chat?`,
  knowledge: [
    `${BUSINESS.name} builds AI automation for businesses such as dental clinics, med spas, real estate, roofing, auto repair and law firms.`,
    'Services: 1) AI Appointment Booking: replies to customers, checks availability, books, confirms, reminds, reschedules. 2) AI Lead Follow-Up & Qualification: replies to new leads in seconds, asks qualifying questions, follows up for days, alerts the sales team. 3) AI Customer Support and AI phone agents: answers calls and messages 24/7 and hands over to a human when needed.',
    'Channels: website chat, WhatsApp, SMS, Instagram, Facebook, email and phone calls. Works with Google Calendar, Outlook, HubSpot and other CRMs.',
    `Free consultation: ${BOOKING.durationMinutes} minutes, ${BOOKING.format}.`,
    'Pricing: every setup is custom, so there is no fixed price list. Do not quote prices. Offer the free consultation to get an exact quote.',
    'Setup usually takes 1 to 3 weeks depending on the systems.'
  ].join('\n'),
  questions: [
    'What kind of business do you run?',
    'What would you most like to automate?',
    'Roughly how many calls or messages do you get each week?',
    'How soon would you like to get started?'
  ].join('\n'),
  transferNumber: '',
  callStart: '09:00',
  callEnd: '19:00',
  callDays: [1, 2, 3, 4, 5],
  autoCallLeads: false,
  recordCalls: true,
  emailSummaries: true,
  maxMinutes: 10
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function cleanVoiceSettings(body) {
  const d = VOICE_DEFAULTS;
  const s = {
    agentName: clean(body.agentName, 40) || d.agentName,
    voiceId: VOICES.includes(body.voiceId) ? body.voiceId : d.voiceId,
    greeting: cleanText(body.greeting, 400) || d.greeting,
    outboundGreeting: cleanText(body.outboundGreeting, 400) || d.outboundGreeting,
    knowledge: cleanText(body.knowledge, 8000),
    questions: cleanText(body.questions, 1500),
    transferNumber: body.transferNumber ? toE164(body.transferNumber) || '' : '',
    callStart: TIME_RE.test(body.callStart) ? body.callStart : d.callStart,
    callEnd: TIME_RE.test(body.callEnd) ? body.callEnd : d.callEnd,
    callDays: Array.isArray(body.callDays) ? [...new Set(body.callDays.map(Number).filter((n) => n >= 0 && n <= 6))].sort() : d.callDays,
    autoCallLeads: body.autoCallLeads === true,
    recordCalls: body.recordCalls !== false,
    emailSummaries: body.emailSummaries !== false,
    maxMinutes: Math.min(30, Math.max(2, Number(body.maxMinutes) || d.maxMinutes))
  };
  if (body.transferNumber && !s.transferNumber) throw Object.assign(new Error('The transfer number must include the country code, e.g. +1 416 555 0100.'), { code: 'invalid' });
  return s;
}
export async function getVoiceSettings() {
  let saved = {};
  try { saved = (await siteStore().get('voice', { type: 'json' })) || {}; } catch { /* use defaults */ }
  return { ...VOICE_DEFAULTS, ...saved };
}

/* ---------- Phone numbers ---------- */
/** "+92 300 1234567", "(416) 555-0100", "0044 20..." → E.164 ("+14165550100"), or '' if it can't be a phone number. */
export function toE164(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  const plus = s.startsWith('+');
  let digits = s.replace(/\D/g, '');
  if (!plus && digits.startsWith('00')) digits = digits.slice(2);
  else if (!plus && digits.length === 10) digits = env('DEFAULT_COUNTRY_CODE', '1').replace(/\D/g, '') + digits;
  else if (!plus && digits.length === 11 && digits.startsWith('1')) { /* North America with leading 1 */ }
  return digits.length >= 8 && digits.length <= 15 ? '+' + digits : '';
}

/* ---------- Business time helpers ---------- */
const localNow = businessNow; // read with getUTC*()
export function withinCallingHours(settings, now = localNow()) {
  const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  return settings.callDays.includes(now.getUTCDay()) && hhmm >= settings.callStart && hhmm < settings.callEnd;
}
const todayLabel = () => localNow().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/* ---------- Vapi API ---------- */
export const voiceConfigured = () => !!(env('VAPI_API_KEY') && env('VAPI_WEBHOOK_SECRET'));
export async function vapi(path, { method = 'GET', body } = {}) {
  const base = env('VAPI_API_BASE', 'https://api.vapi.ai').replace(/\/$/, '');
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${env('VAPI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) { throw Object.assign(new Error('Could not reach Vapi. Please try again.'), { code: 'vapi_unreachable', cause: err }); }
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join('; ') : data.message || data.error || `Vapi error ${res.status}`;
    throw Object.assign(new Error(`Vapi: ${msg}`), { code: 'vapi_error', status: res.status });
  }
  return data;
}

/** The Server URL Vapi calls during calls, with the shared secret header so we know requests are really from Vapi. */
export const webhookServer = (base) => ({
  url: `${base}/api/voice/webhook`,
  timeoutSeconds: 20,
  headers: { 'x-vapi-secret': env('VAPI_WEBHOOK_SECRET') }
});
export function isFromVapi(req) {
  const secret = env('VAPI_WEBHOOK_SECRET');
  if (!secret) return false;
  const got = req.headers.get('x-vapi-secret') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Phone number used for calls: saved by "Connect phone number" in the admin panel (or VAPI_PHONE_NUMBER_ID). */
export async function getConnection() {
  let saved = {};
  try { saved = (await siteStore().get('voice-number', { type: 'json' })) || {}; } catch { /* none */ }
  return { phoneNumberId: saved.phoneNumberId || env('VAPI_PHONE_NUMBER_ID'), number: saved.number || env('TWILIO_PHONE_NUMBER'), connectedAt: saved.connectedAt || null };
}

/* ---------- The agent ---------- */
const fill = (text, vars) => String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');

function systemPrompt(s, { direction, name, reason, callerNumber }) {
  const questions = s.questions.split('\n').map((q) => q.trim()).filter(Boolean);
  return `You are ${s.agentName}, the AI phone assistant for ${BUSINESS.name}. You are on a live phone call, so everything you write is spoken aloud.

# How to speak
- Keep every reply short: one or two sentences, then let the caller talk. Ask one question at a time.
- Sound warm, calm and natural. No lists, markdown, emojis or URLs. Say times like "ten thirty AM" and dates like "Thursday the twenty-sixth".
- If you didn't catch something, ask the caller to repeat it. If asked, say honestly that you are an AI assistant.
- Only use the business information below. Never make up prices, promises, or facts. If you don't know, say a team member will follow up.

# Business information
${s.knowledge || `${BUSINESS.name} provides AI automation services.`}

# This call
- Direction: ${direction === 'outbound' ? `outgoing call that you placed to ${name || 'a lead'}${reason ? `, about: ${reason}` : ''}` : 'incoming call to the business'}
- Caller phone number: ${callerNumber || 'unknown'} (you already have it, don't ask for it unless they want a different number)
- Today is ${todayLabel()} (${BOOKING.timeZoneLabel}).

# Your goals, in order
1. Find out what the caller needs and help them with the business information above.
2. If they could be a customer, ask these qualifying questions naturally, one at a time (skip any already answered):
${questions.map((q, i) => `   ${i + 1}. ${q}`).join('\n') || '   (none)'}
3. Offer the free ${BOOKING.durationMinutes}-minute consultation. To book: call check_availability, offer two or three of the returned times, and once they choose, collect their full name and email (ask them to spell the email, then read it back), then call book_appointment with the exact date and time values the tool returned. Confirm the booking out loud.
4. Before the call ends, call save_lead_details with everything you learned and a one-sentence summary. Call it even if they didn't book.

# Rules
- ${s.transferNumber ? 'If the caller asks for a person, is upset, or needs something you cannot handle, tell them you will connect them and use the transferCall tool.' : 'No live transfer is available. If the caller asks for a person, take their details with save_lead_details and say the team will call back within one business day.'}
- ${direction === 'outbound' ? 'If you reach voicemail, leave one short message saying who you are, why you called, and that they can call back, then end the call. If they say it is a bad time, offer to call back later and end politely. If they ask not to be called again, apologise, note "do not call" in save_lead_details, and end the call.' : 'If the caller seems to have the wrong number, end politely.'}
- Never ask for card numbers, passwords or sensitive health details.
- When the conversation is finished and you have said goodbye, use the endCall tool.`;
}

const fnTool = (server, name, description, properties, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
  server
});

export function buildAssistant(s, { direction = 'inbound', name = '', reason = '', callerNumber = '', base }) {
  const server = webhookServer(base);
  const tools = [
    fnTool(server, 'check_availability',
      `Get free consultation times (${BOOKING.durationMinutes} minutes, ${BOOKING.timeZoneLabel}). Optionally pass a date the caller asked for.`,
      { date: { type: 'string', description: 'Optional preferred date as YYYY-MM-DD' } }),
    fnTool(server, 'book_appointment',
      'Book the free consultation in a time returned by check_availability. Only call after the caller chose a time and gave their name.',
      {
        date: { type: 'string', description: 'YYYY-MM-DD, exactly as returned by check_availability' },
        time: { type: 'string', description: 'HH:MM 24-hour, exactly as returned by check_availability' },
        full_name: { type: 'string' },
        email: { type: 'string', description: 'Email address, confirmed with the caller' },
        business_name: { type: 'string' },
        topic: { type: 'string', description: 'What they want to discuss' }
      }, ['date', 'time', 'full_name']),
    fnTool(server, 'save_lead_details',
      'Save what you learned about the caller. Call before the call ends, even if nothing was booked.',
      {
        full_name: { type: 'string' },
        business_name: { type: 'string' },
        email: { type: 'string' },
        business_type: { type: 'string' },
        needs: { type: 'string', description: 'What they want to automate or need help with' },
        volume: { type: 'string', description: 'Calls or messages per week, if mentioned' },
        timeline: { type: 'string', description: 'How soon they want to start' },
        interest: { type: 'string', enum: ['hot', 'warm', 'cold', 'not_a_lead'], description: 'hot = ready to buy or booked, warm = interested, cold = just browsing' },
        follow_up: { type: 'string', description: 'Anything the team must do next, e.g. call back, send info, do not call' },
        summary: { type: 'string', description: 'One or two sentence summary of the call' }
      }, ['summary', 'interest']),
    { type: 'endCall' }
  ];
  if (s.transferNumber) {
    tools.push({
      type: 'transferCall',
      destinations: [{ type: 'number', number: s.transferNumber, message: 'Sure, connecting you with the team now. One moment please.', description: 'Transfer to a team member' }]
    });
  }
  const vars = { name: (name || '').split(' ')[0] || 'there', reason: reason || 'your recent inquiry', business: BUSINESS.name, agent: s.agentName };
  return {
    name: `${BUSINESS.name} phone agent`,
    firstMessage: fill(direction === 'outbound' ? s.outboundGreeting : s.greeting, vars),
    firstMessageMode: 'assistant-speaks-first',
    model: {
      provider: 'anthropic',
      model: env('VAPI_MODEL', 'claude-haiku-5-5'),
      messages: [{ role: 'system', content: systemPrompt(s, { direction, name, reason, callerNumber }) }],
      tools
    },
    voice: { provider: 'vapi', voiceId: s.voiceId },
    server,
    serverMessages: ['tool-calls', 'status-update', 'end-of-call-report'],
    artifactPlan: { recordingEnabled: !!s.recordCalls },
    maxDurationSeconds: s.maxMinutes * 60,
    endCallMessage: 'Thanks for your time. Goodbye!'
  };
}

/* ---------- Call records ---------- */
export const callerNumberOf = (call = {}) => call.customer?.number || call.phoneCallProviderDetails?.from || call.from || '';
export async function getCall(id) { return (await callsStore().get(`call/${id}`, { type: 'json' })) || null; }
export async function saveCall(id, patch) {
  const store = callsStore();
  const current = (await store.get(`call/${id}`, { type: 'json' })) || { id, createdAt: new Date().toISOString() };
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await store.setJSON(`call/${id}`, next);
  return next;
}

/** Start an outgoing call. Returns the saved call record. */
export async function startOutboundCall({ req, number, name = '', reason = '', leadId = null, origin = 'manual' }) {
  if (!voiceConfigured()) throw Object.assign(new Error('AI calling is not set up yet. Add VAPI_API_KEY and VAPI_WEBHOOK_SECRET in Vercel.'), { code: 'not_configured' });
  const to = toE164(number);
  if (!to) throw Object.assign(new Error('Enter the phone number with its country code, e.g. +1 416 555 0100.'), { code: 'invalid' });
  const { phoneNumberId } = await getConnection();
  if (!phoneNumberId) throw Object.assign(new Error('Connect your phone number first (Admin → AI Calls → Connect).'), { code: 'not_connected' });
  const settings = await getVoiceSettings();
  const base = getSiteUrl(req);
  const call = await vapi('/call', {
    method: 'POST',
    body: {
      phoneNumberId,
      customer: { number: to, ...(name ? { name: clean(name, 40) } : {}) },
      assistant: buildAssistant(settings, { direction: 'outbound', name, reason, callerNumber: to, base })
    }
  });
  return saveCall(call.id, {
    direction: 'outbound', number: to, name: clean(name, 120), reason: clean(reason, 200),
    leadId, origin, status: call.status || 'queued', startedAt: null
  });
}

/* ---------- Tools the agent uses during calls ---------- */
async function freeSlots(preferredDate) {
  const dates = bookableDates();
  const taken = new Set((await bookingsStore().list({ prefix: 'slot/' })).blobs.map((b) => b.key));
  const nowPlus = Date.now() + 2 * 3600e3; // at least 2 hours' notice
  const startIdx = preferredDate && dates.includes(preferredDate) ? dates.indexOf(preferredDate) : 0;
  const out = [];
  for (const date of dates.slice(startIdx)) {
    const times = BOOKING.times.filter((t) => !taken.has(slotKey(date, t)) && slotStart(date, t).getTime() > nowPlus);
    if (times.length) out.push({ date, times });
    if (out.length >= 3) break;
  }
  return out;
}

async function checkAvailability(args) {
  const days = await freeSlots(clean(args.date, 10));
  if (!days.length) return 'There are no free consultation times in the next two weeks. Offer to have the team call them back to arrange a time.';
  const note = args.date && days[0].date !== args.date ? `No free times on ${args.date}. ` : '';
  return note + 'Free times (' + BOOKING.timeZoneLabel + '): ' + days.map((d) =>
    `${slotLabel(d.date, '00:00').replace(/ at .*/, '')}: ${d.times.map((t) => `${slotLabel(d.date, t).replace(/.* at /, '')} [date=${d.date} time=${t}]`).join(', ')}`
  ).join('. ') + '. Offer two or three of these. Use the exact date and time values when booking.';
}

async function bookAppointment(args, ctx) {
  const date = clean(args.date, 10), time = clean(args.time, 5);
  if (!bookableDates().includes(date) || !BOOKING.times.includes(time)) return 'That time is not bookable. Call check_availability and offer one of the returned times.';
  const email = clean(args.email, 254).toLowerCase();
  const lead = {
    id: newId(), createdAt: new Date().toISOString(), status: 'new', source: 'booking', channel: 'phone',
    full_name: clean(args.full_name, 120), business_name: clean(args.business_name, 160),
    email: isEmail(email) ? email : '', phone: ctx.callerNumber, service: clean(args.topic, 80) || 'Not sure yet',
    message: `Booked by phone with the AI assistant (call ${ctx.callId}).`, timezone: BOOKING.timeZoneLabel,
    date, time, slotLabel: slotLabel(date, time), callId: ctx.callId
  };
  if (!lead.full_name) return 'Ask for their full name first, then book again.';
  const key = slotKey(date, time);
  if (!(await bookingsStore().setIfAbsent(key, lead.id))) {
    return `Sorry, ${lead.slotLabel} was just taken. ` + await checkAvailability({ date });
  }
  await leadsStore().setJSON(`lead/${lead.id}`, lead);
  await saveCall(ctx.callId, { outcome: 'booked', bookingLeadId: lead.id, slotLabel: lead.slotLabel, name: lead.full_name });
  try { await ctx.afterBooking?.(lead); } catch (err) { console.error('[voice] booking emails failed', err); }
  return `Booked: ${lead.slotLabel} (${BOOKING.timeZoneLabel}).${lead.email ? ` A confirmation email with a calendar invite is going to ${lead.email}.` : ' No valid email was given, so the team will confirm by phone.'} Confirm this to the caller.`;
}

const SCORE = { hot: 90, warm: 65, cold: 30, not_a_lead: 0 };
async function saveLeadDetails(args, ctx) {
  const call = (await getCall(ctx.callId)) || {};
  const details = {
    full_name: clean(args.full_name, 120), business_name: clean(args.business_name, 160),
    email: isEmail(clean(args.email, 254).toLowerCase()) ? clean(args.email, 254).toLowerCase() : '',
    business_type: clean(args.business_type, 120), needs: cleanText(args.needs, 600), volume: clean(args.volume, 120),
    timeline: clean(args.timeline, 120), interest: SCORE[args.interest] !== undefined ? args.interest : 'warm',
    follow_up: cleanText(args.follow_up, 400), summary: cleanText(args.summary, 800)
  };
  const score = SCORE[details.interest] + (call.outcome === 'booked' ? 10 : 0);
  await saveCall(ctx.callId, { details, summary: details.summary, score: Math.min(100, score), name: details.full_name || call.name || '' });
  if (details.interest === 'not_a_lead' || call.bookingLeadId) return 'Saved. Continue the conversation or wrap up politely.';

  // Create or update the lead in the admin panel's Leads list
  const store = leadsStore();
  const id = call.callLeadId || call.leadId || newId();
  const existing = (await store.get(`lead/${id}`, { type: 'json' })) || {};
  const lead = {
    ...existing, id, createdAt: existing.createdAt || new Date().toISOString(), status: existing.status || 'new',
    source: existing.source || 'call', channel: 'phone', callId: ctx.callId,
    full_name: details.full_name || existing.full_name || call.name || 'Phone caller',
    business_name: details.business_name || existing.business_name || '',
    email: details.email || existing.email || '', phone: existing.phone || ctx.callerNumber,
    service: existing.service || 'Phone call',
    message: [existing.message, `AI call summary: ${details.summary}`, details.needs && `Needs: ${details.needs}`,
      details.business_type && `Business: ${details.business_type}`, details.volume && `Volume: ${details.volume}`,
      details.timeline && `Timeline: ${details.timeline}`, details.follow_up && `Follow-up: ${details.follow_up}`,
      `Interest: ${details.interest} (score ${Math.min(100, score)})`].filter(Boolean).join('\n'),
    score: Math.min(100, score)
  };
  await store.setJSON(`lead/${id}`, lead);
  await saveCall(ctx.callId, { callLeadId: id });
  return 'Saved. Continue the conversation or wrap up politely.';
}

export const TOOL_HANDLERS = { check_availability: checkAvailability, book_appointment: bookAppointment, save_lead_details: saveLeadDetails };
