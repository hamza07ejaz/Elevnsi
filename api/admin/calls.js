// /api/admin/calls (admin only): the AI phone agent
//   GET                               setup status, agent settings and the call log
//   PUT  {settings}                   save the agent settings
//   POST {action:'connect'}           connect the Twilio number to Vapi (or re-point an existing Vapi number)
//   POST {action:'call', number, name, reason}   AI calls someone now
//   DELETE ?id=                       delete a call record
import { json, fail, readJson, route, isAdmin, env, siteUrl, siteStore, callsStore } from '../../lib/core.mjs';
import {
  VOICES, getVoiceSettings, cleanVoiceSettings, voiceConfigured, getConnection, vapi, webhookServer,
  startOutboundCall, toE164, withinCallingHours
} from '../../lib/voice.mjs';

const guard = (fn) => route(async (req) => {
  if (!isAdmin(req)) return fail(401, 'unauthorized', 'Please sign in again.');
  try { return await fn(req); }
  catch (err) {
    if (err.code && err.code !== 'storage_error' && err.message) return fail(err.code === 'invalid' ? 422 : 400, err.code, err.message);
    throw err;
  }
});

export const GET = guard(async (req) => {
  const store = callsStore();
  const { blobs } = await store.list({ prefix: 'call/' });
  const calls = (await store.getManyJSON(blobs.map((b) => b.key))).filter(Boolean);
  calls.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const settings = await getVoiceSettings();
  const connection = await getConnection();
  return json({
    settings, voices: VOICES, connection,
    setup: {
      vapiKey: !!env('VAPI_API_KEY'),
      webhookSecret: !!env('VAPI_WEBHOOK_SECRET'),
      twilio: !!(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_PHONE_NUMBER')),
      connected: !!connection.phoneNumberId,
      siteUrl: !!env('SITE_URL'),
      webhookUrl: `${siteUrl(req)}/api/voice/webhook`,
      withinHours: withinCallingHours(settings)
    },
    calls: calls.slice(0, 300)
  });
});

export const PUT = guard(async (req) => {
  const body = await readJson(req);
  if (!body?.settings) return fail(400, 'invalid', 'Nothing to save.');
  const settings = cleanVoiceSettings(body.settings);
  await siteStore().setJSON('voice', settings);
  return json({ ok: true, settings });
});

export const POST = guard(async (req) => {
  const body = (await readJson(req)) || {};

  if (body.action === 'connect') {
    if (!voiceConfigured()) return fail(400, 'not_configured', 'Add VAPI_API_KEY and VAPI_WEBHOOK_SECRET in Vercel first, then redeploy.');
    const server = webhookServer(siteUrl(req));
    const current = await getConnection();
    let number;
    if (current.phoneNumberId) {
      // Already in Vapi: make sure incoming calls are sent to this website
      number = await vapi(`/phone-number/${encodeURIComponent(current.phoneNumberId)}`, { method: 'PATCH', body: { server } });
    } else {
      const twilioNumber = toE164(env('TWILIO_PHONE_NUMBER'));
      if (!env('TWILIO_ACCOUNT_SID') || !env('TWILIO_AUTH_TOKEN') || !twilioNumber) {
        return fail(400, 'not_configured', 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in Vercel first (or VAPI_PHONE_NUMBER_ID if the number is already in Vapi), then redeploy.');
      }
      number = await vapi('/phone-number', {
        method: 'POST',
        body: {
          provider: 'twilio', number: twilioNumber, name: 'ELEVNSI AI line',
          twilioAccountSid: env('TWILIO_ACCOUNT_SID'), twilioAuthToken: env('TWILIO_AUTH_TOKEN'),
          server
        }
      });
    }
    const saved = { phoneNumberId: number.id || current.phoneNumberId, number: number.number || current.number || env('TWILIO_PHONE_NUMBER'), connectedAt: new Date().toISOString() };
    await siteStore().setJSON('voice-number', saved);
    return json({ ok: true, connection: saved });
  }

  if (body.action === 'call') {
    if (body.consent !== true) return fail(422, 'invalid', 'Confirm that this person agreed to be called.');
    const call = await startOutboundCall({ req, number: body.number, name: body.name, reason: body.reason, origin: body.test ? 'test' : 'manual' });
    return json({ ok: true, call });
  }

  return fail(400, 'invalid', 'Unknown action.');
});

export const DELETE = guard(async (req) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id || !/^[\w-]{6,80}$/.test(id)) return fail(422, 'invalid', 'Unknown call.');
  await callsStore().delete(`call/${id}`);
  return json({ ok: true });
});
