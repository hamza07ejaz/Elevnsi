// /api/admin/calls (admin only): the AI phone agent
//   GET                               setup status, agent settings and the call log
//   PUT  {settings}                   save the agent settings
//   POST {action:'connect'}           connect the Twilio number to Vapi (or re-point an existing Vapi number)
//   POST {action:'call', number, name, reason}   AI calls someone now
//   DELETE ?id=                       delete a call record
import { json, fail, readJson, route, isAdmin, env, siteUrl, siteStore, callsStore } from '../../lib/core.mjs';
import {
  VOICES, getVoiceSettings, cleanVoiceSettings, voiceConfigured, getConnection, vapi, webhookServer,
  startOutboundCall, toE164, withinCallingHours, recordingLink,
  PROVIDERS, providerReady, phoneProvider, providerNumber
} from '../../lib/voice.mjs';
import crypto from 'node:crypto';

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
  const { vonageCredentialId, vonageKey, ...connection } = await getConnection();
  const provider = phoneProvider();
  // "Connected" means the number in Vapi is the one for the provider and number chosen now
  const matches = connection.provider === 'vapi' || (connection.provider === provider && (!connection.number || toE164(connection.number) === providerNumber(provider)));
  return json({
    settings, voices: VOICES, connection,
    setup: {
      vapiKey: !!env('VAPI_API_KEY'),
      webhookSecret: !!env('VAPI_WEBHOOK_SECRET'),
      provider, providerName: PROVIDERS[provider]?.name || '',
      lineReady: providerReady(provider),
      twilio: providerReady('twilio'),
      connected: !!connection.phoneNumberId && matches,
      needsReconnect: !!connection.phoneNumberId && !matches,
      siteUrl: !!env('SITE_URL'),
      webhookUrl: `${siteUrl(req)}/api/voice/webhook`,
      withinHours: withinCallingHours(settings)
    },
    // Private Vapi recordings play through a short-lived signed link (see api/voice/recording.js)
    calls: calls.slice(0, 300).map((c) => ({
      ...c,
      recordingUrl: undefined,
      audio: c.status === 'ended' && (c.recordingUrl || c.hasRecording) && c.id ? recordingLink(c.id) : ''
    }))
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
    if (!voiceConfigured()) return fail(400, 'not_configured', 'Add your Vapi private key in Integrations → Vapi first.');
    const server = webhookServer(siteUrl(req));
    const current = await getConnection();
    const provider = phoneProvider();
    const wanted = providerNumber(provider);
    const now = new Date().toISOString();

    // Number added inside Vapi by hand (Integrations → Vapi phone number ID): just point it at this website
    if (current.provider === 'vapi') {
      const n = await vapi(`/phone-number/${encodeURIComponent(current.phoneNumberId)}`, { method: 'PATCH', body: { server } });
      const saved = { provider: 'vapi', phoneNumberId: current.phoneNumberId, number: n.number || wanted, connectedAt: now };
      await siteStore().setJSON('voice-number', saved);
      return json({ ok: true, connection: saved });
    }

    if (!provider) return fail(400, 'not_configured', 'Add your Twilio or Vonage keys and phone number in Integrations first.');
    if (!providerReady(provider)) {
      const P = PROVIDERS[provider];
      return fail(400, 'not_configured', `${P.name} is chosen as your phone line, but its keys or phone number are missing. Fill in Integrations → ${P.name}.`);
    }

    // Same provider and number already in Vapi: re-point it at this website (re-import if it was deleted in Vapi)
    if (current.phoneNumberId && current.provider === provider && (!current.number || toE164(current.number) === wanted)) {
      try {
        await vapi(`/phone-number/${encodeURIComponent(current.phoneNumberId)}`, { method: 'PATCH', body: { server } });
        const saved = { ...current, manual: undefined, number: wanted, connectedAt: now };
        await siteStore().setJSON('voice-number', saved);
        return json({ ok: true, connection: saved });
      } catch (err) { if (err.status !== 404) throw err; }
    }

    let saved;
    if (provider === 'twilio') {
      const n = await vapi('/phone-number', {
        method: 'POST',
        body: {
          provider: 'twilio', number: wanted, name: 'ELEVNSI AI line',
          twilioAccountSid: env('TWILIO_ACCOUNT_SID'), twilioAuthToken: env('TWILIO_AUTH_TOKEN'), server
        }
      });
      // keep the Vonage credential so switching back later doesn't create a second one
      saved = { provider, phoneNumberId: n.id, number: wanted, connectedAt: now, vonageCredentialId: current.vonageCredentialId || undefined, vonageKey: current.vonageKey || undefined };
    } else {
      // Vonage: Vapi needs the Vonage API key saved as a Vapi credential first
      const keyTag = crypto.createHash('sha256').update(env('VONAGE_API_KEY') + ':' + env('VONAGE_API_SECRET')).digest('hex').slice(0, 16);
      let credentialId = env('VONAGE_CREDENTIAL_ID') || (current.vonageKey === keyTag ? current.vonageCredentialId : '');
      if (!credentialId) {
        try {
          const cred = await vapi('/credential', { method: 'POST', body: { provider: 'vonage', apiKey: env('VONAGE_API_KEY'), apiSecret: env('VONAGE_API_SECRET'), name: 'ELEVNSI Vonage' } });
          credentialId = cred.id;
        } catch (err) {
          if (err.code !== 'vapi_error') throw err;
          return fail(400, 'vonage_credential', `${err.message}. Vapi couldn't save your Vonage key. Check the API key and secret (Test connection on the Vonage card), or import the number yourself in the Vapi dashboard (Phone Numbers → Import → Vonage) and paste its ID in Integrations → Vapi → Vapi phone number ID.`);
        }
      }
      const importVonage = (number) => vapi('/phone-number', { method: 'POST', body: { provider: 'vonage', number, credentialId, name: 'ELEVNSI AI line', server } });
      let n;
      try { n = await importVonage(wanted); }
      catch (err) {
        // Vonage writes numbers without "+"; try that format once
        if (err.status !== 400) throw err;
        n = await importVonage(wanted.replace('+', ''));
      }
      saved = { provider, phoneNumberId: n.id, number: wanted, connectedAt: now, vonageCredentialId: credentialId, vonageKey: keyTag };
    }
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
