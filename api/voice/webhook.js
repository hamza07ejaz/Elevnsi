// POST /api/voice/webhook : the "Server URL" Vapi calls during phone calls.
//   assistant-request   incoming call → reply with the AI agent (greeting, knowledge, tools)
//   tool-calls          the agent checks times, books, saves lead details
//   status-update       ringing / in-progress / forwarding / ended
//   end-of-call-report  transcript, recording, cost → saved; summary emailed to the team
// Every request must carry the shared secret (x-vapi-secret), which we add to everything we send to Vapi.
import { json, fail, readJson, route, env, siteUrl, getContactSettings } from '../../lib/core.mjs';
import {
  isFromVapi, getVoiceSettings, buildAssistant, saveCall, getCall, callerNumberOf, TOOL_HANDLERS
} from '../../lib/voice.mjs';
import { sendMail, customerEmail, adminEmail, bookingIcs, callSummaryEmail } from '../../lib/mail.mjs';

const adminTo = async () => env('ADMIN_EMAIL') || (await getContactSettings()).email || env('SMTP_USER');

export const POST = route(async (req) => {
  if (!env('VAPI_WEBHOOK_SECRET')) return fail(503, 'not_configured', 'VAPI_WEBHOOK_SECRET is not set.');
  if (!isFromVapi(req)) return fail(401, 'unauthorized', 'Unknown sender.');
  const body = await readJson(req);
  const msg = body?.message;
  if (!msg?.type) return fail(400, 'invalid', 'No message.');
  const call = msg.call || {};
  const callId = call.id;
  const base = siteUrl(req);

  switch (msg.type) {
    case 'assistant-request': {
      // Must answer within 7.5 seconds, so only fast work here
      const callerNumber = callerNumberOf(call);
      const [settings] = await Promise.all([
        getVoiceSettings(),
        callId ? saveCall(callId, { direction: 'inbound', number: callerNumber, status: 'ringing', origin: 'inbound' }) : null
      ]);
      return json({ assistant: buildAssistant(settings, { direction: 'inbound', callerNumber, base }) });
    }

    case 'tool-calls': {
      const list = msg.toolCallList || (msg.toolWithToolCallList || []).map((t) => t.toolCall).filter(Boolean);
      const existing = callId ? await getCall(callId) : null;
      const ctx = {
        callId: callId || 'unknown',
        callerNumber: existing?.number || callerNumberOf(call),
        afterBooking: async (lead) => {
          const to = await adminTo();
          await Promise.allSettled([
            lead.email ? sendMail({ to: lead.email, ...customerEmail(lead, base), replyTo: to, ics: bookingIcs(lead, base) }) : null,
            sendMail({ to, ...adminEmail(lead, base), replyTo: lead.email || undefined })
          ]);
        }
      };
      const results = [];
      for (const tc of list) {
        const name = tc.function?.name || tc.name;
        let args = tc.function?.arguments ?? tc.arguments ?? {};
        if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
        const handler = TOOL_HANDLERS[name];
        try {
          results.push({ toolCallId: tc.id, result: handler ? await handler(args, ctx) : `Unknown tool ${name}.` });
        } catch (err) {
          console.error('[voice] tool failed', name, err);
          results.push({ toolCallId: tc.id, error: 'That did not work because of a system problem. Apologise and say the team will follow up.' });
        }
      }
      return json({ results });
    }

    case 'status-update': {
      if (!callId) return json({});
      const patch = { status: msg.status };
      if (msg.status === 'in-progress') patch.startedAt = new Date().toISOString();
      if (msg.status === 'forwarding') patch.transferred = true;
      const existing = await getCall(callId);
      if (!existing) Object.assign(patch, { direction: call.type === 'outboundPhoneCall' ? 'outbound' : 'inbound', number: callerNumberOf(call) });
      await saveCall(callId, patch);
      return json({});
    }

    case 'end-of-call-report': {
      if (!callId) return json({});
      const existing = (await getCall(callId)) || {};
      const artifact = msg.artifact || {};
      const started = Date.parse(msg.startedAt || call.startedAt || existing.startedAt || '');
      const ended = Date.parse(msg.endedAt || call.endedAt || '') || Date.now();
      const durationSeconds = Number.isFinite(started) ? Math.max(0, Math.round((ended - started) / 1000)) : Math.round(msg.durationSeconds || 0);
      const reason = String(msg.endedReason || call.endedReason || '');
      const outcome = existing.outcome === 'booked' ? 'booked'
        : existing.transferred || /forward/.test(reason) ? 'transferred'
        : /voicemail/.test(reason) ? 'voicemail'
        : /did-not-answer|no-answer|busy/.test(reason) ? 'no-answer'
        : /error|failed|pipeline/.test(reason) ? 'failed'
        : 'completed';
      const analysis = msg.analysis || call.analysis || {};
      const saved = await saveCall(callId, {
        status: 'ended', endedReason: reason, outcome, durationSeconds,
        startedAt: Number.isFinite(started) ? new Date(started).toISOString() : existing.startedAt || null,
        endedAt: new Date(ended).toISOString(),
        direction: existing.direction || (call.type === 'outboundPhoneCall' ? 'outbound' : 'inbound'),
        number: existing.number || callerNumberOf(call),
        transcript: String(artifact.transcript || msg.transcript || '').slice(0, 60000),
        recordingUrl: findUrl(artifact.recording) || artifact.recordingUrl || msg.recordingUrl || '',
        summary: existing.summary || analysis.summary || '',
        cost: typeof msg.cost === 'number' ? msg.cost : (typeof call.cost === 'number' ? call.cost : existing.cost ?? null)
      });
      const settings = await getVoiceSettings();
      const worthEmailing = ['completed', 'booked', 'transferred'].includes(outcome) && durationSeconds >= 5;
      if (settings.emailSummaries && worthEmailing) {
        try { await sendMail({ to: await adminTo(), ...callSummaryEmail(saved, base) }); }
        catch (err) { console.error('[voice] summary email failed', err); }
      }
      return json({});
    }

    default:
      return json({});
  }
});

/** The recording object's shape varies; take the first audio URL in it. */
function findUrl(obj, depth = 0) {
  if (!obj || depth > 3) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : '';
  for (const k of ['stereoUrl', 'url', 'combinedUrl', 'mono', 'recordingUrl']) {
    const v = obj[k]; const found = findUrl(v, depth + 1); if (found) return found;
  }
  for (const v of Object.values(obj)) { const found = findUrl(v, depth + 1); if (found) return found; }
  return '';
}
