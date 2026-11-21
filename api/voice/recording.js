// GET /api/voice/recording?t=<signed token> : plays a call recording in the admin panel.
// Vapi recordings are private (they need the Vapi API key), so an <audio> player can't open them directly.
// The admin panel gets a short-lived signed link from /api/admin/calls; this route checks it, asks Vapi for
// a fresh download link with the API key, and sends the browser there. The API key never leaves the server.
// The signed link is made by recordingLink() in lib/voice.mjs.
import { fail, route, env, verifySigned } from '../../lib/core.mjs';

const KINDS = ['mono-recording', 'stereo-recording'];

export const GET = route(async (req) => {
  const data = verifySigned(new URL(req.url).searchParams.get('t') || '');
  const m = /^rec:([\w-]{6,80}):(\d+)$/.exec(data || '');
  if (!m) return fail(403, 'forbidden', 'This recording link is not valid.');
  if (Number(m[2]) < Date.now()) return fail(403, 'expired', 'This recording link has expired. Reload the admin panel.');
  if (!env('VAPI_API_KEY')) return fail(503, 'not_configured', 'Add your Vapi key in Admin → Integrations.');

  const base = env('VAPI_API_BASE', 'https://api.vapi.ai').replace(/\/$/, '');
  let lastStatus = 0;
  for (const kind of KINDS) {
    let res;
    try {
      res = await fetch(`${base}/call/${encodeURIComponent(m[1])}/${kind}`, {
        headers: { Authorization: `Bearer ${env('VAPI_API_KEY')}` },
        redirect: 'manual'
      });
    } catch { return fail(502, 'vapi_unreachable', 'Could not reach Vapi. Please try again.'); }
    lastStatus = res.status;
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      // Short-lived download link from Vapi: the browser streams and seeks it directly
      return new Response(null, { status: 302, headers: { location, 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } });
    }
    if (res.ok && res.body) {
      const type = res.headers.get('content-type') || 'audio/wav';
      if (/json/.test(type)) {
        const j = await res.json().catch(() => ({}));
        const url = j.url || j.signedUrl || j.presignedUrl;
        if (url) return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'private, no-store' } });
        continue;
      }
      const headers = { 'content-type': type, 'cache-control': 'private, no-store' };
      const len = res.headers.get('content-length'); if (len) headers['content-length'] = len;
      return new Response(res.body, { status: 200, headers });
    }
    if (res.status === 401 || res.status === 403) return fail(502, 'vapi_key', 'Vapi refused the API key. Check it in Admin → Integrations.');
  }
  return fail(404, 'not_found', lastStatus === 404 ? 'Vapi has no recording for this call (recording may be off, or the call was too short).' : 'The recording is not ready yet. Try again in a minute.');
});
