// GET /demo/... (vercel.json rewrites it here): the private console demo, for invited people only.
//   /demo/?k=<invite code>  checks the invite, sets a sign-in cookie for this browser, then opens the demo
//   /demo/                  opens the demo if this browser has a valid cookie and the invite is still active
// The demo files live in /private/demo (not in /public), so they can't be opened directly.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  route, env, demoStore, signValue, verifySigned, getCookie, validInviteCode, inviteState, getContactSettings, siteUrl
} from '../lib/core.mjs';
import { sendMail } from '../lib/mail.mjs';

const DIR = path.join(process.cwd(), 'private', 'demo');
const FILES = {
  'index.html': 'text/html; charset=utf-8',
  'styles.css': 'text/css; charset=utf-8',
  'data.js': 'text/javascript; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'advanced.js': 'text/javascript; charset=utf-8'
};
const COOKIE = 'elv_demo';
const MAX_COOKIE_DAYS = 30;
const PRIVATE_HEADERS = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' };

const isLocal = (req) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(req.url).hostname);

function sessionCookie(req, code, inv) {
  const limit = Date.now() + MAX_COOKIE_DAYS * 864e5;
  const exp = Math.min(limit, inv.expiresAt ? Date.parse(inv.expiresAt) : limit);
  const value = signValue(Buffer.from(JSON.stringify({ c: code, exp })).toString('base64url'));
  const maxAge = Math.max(0, Math.floor((exp - Date.now()) / 1000));
  return `${COOKIE}=${value}; Path=/demo; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isLocal(req) ? '' : '; Secure'}`;
}
function readSession(req) {
  const data = verifySigned(getCookie(req, COOKIE));
  if (!data) return null;
  try {
    const s = JSON.parse(Buffer.from(data, 'base64url').toString());
    return validInviteCode(s.c) && s.exp > Date.now() ? s : null;
  } catch { return null; }
}

async function recordOpen(req, code, inv, firstVisitOfLink) {
  const now = new Date().toISOString();
  const first = !inv.firstOpenedAt;
  inv.views = (inv.views || 0) + 1;
  inv.lastOpenedAt = now;
  if (first) inv.firstOpenedAt = now;
  await demoStore().setJSON(`invite/${code}`, inv);
  if (first && firstVisitOfLink) {
    // Let the team know the first time each person opens their demo (best effort)
    try {
      const contact = await getContactSettings();
      const to = env('ADMIN_EMAIL') || contact.email || env('SMTP_USER');
      const who = inv.name + (inv.note ? ` (${inv.note})` : '');
      const admin = `${siteUrl(req)}/#admin`;
      await sendMail({
        to,
        subject: `${inv.name} just opened your ELEVNSI demo`,
        text: `${who} opened the private demo for the first time.\n\nSee all invites: ${admin}`,
        html: `<p><strong>${esc(who)}</strong> opened the private ELEVNSI demo for the first time.</p><p><a href="${admin}">See all demo invites</a></p>`
      });
    } catch (err) { console.error('[demo] notify failed', err); }
  }
}

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const file = (url.searchParams.get('path') || '').replace(/^\/+/, '') || 'index.html';
  const key = url.searchParams.get('k');

  // 1. Arriving from an invite link
  if (key !== null) {
    if (!validInviteCode(key)) return locked('missing');
    const inv = await demoStore().get(`invite/${key}`, { type: 'json' });
    const state = inviteState(inv);
    if (state !== 'active') return locked(state);
    await recordOpen(req, key, inv, true);
    // Redirect to the clean address (the browser keeps any #page part, e.g. #booking)
    return new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, location: '/demo', 'set-cookie': sessionCookie(req, key, inv) } });
  }

  if (!FILES[file]) return new Response('Not found', { status: 404, headers: PRIVATE_HEADERS });
  const session = readSession(req);
  if (!session) return locked('missing');

  // 2. The page itself: re-check the invite every time, so switching it off works immediately
  if (file === 'index.html') {
    const inv = await demoStore().get(`invite/${session.c}`, { type: 'json' });
    const state = inviteState(inv);
    if (state !== 'active') return locked(state, true);
    await recordOpen(req, session.c, inv, false);
  }

  const body = await fs.readFile(path.join(DIR, file));
  return new Response(body, { status: 200, headers: { ...PRIVATE_HEADERS, 'content-type': FILES[file] } });
});

/* ---------- "This demo is private" page ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESSAGES = {
  missing: ['This demo is private', 'The ELEVNSI console demo is shared by invitation only. If you were sent a link, open it again from that message, or ask us for access.'],
  expired: ['This invite link has expired', 'Demo links are valid for a limited time. Ask us for a new link and we will send one right away.'],
  revoked: ['This invite link is no longer active', 'Access with this link has ended. Ask us if you would like to see the demo again.']
};
function locked(state, clearCookie = false) {
  const [title, text] = MESSAGES[state] || MESSAGES.missing;
  const headers = { ...PRIVATE_HEADERS, 'content-type': 'text/html; charset=utf-8' };
  if (clearCookie) headers['set-cookie'] = `${COOKIE}=; Path=/demo; Max-Age=0; HttpOnly; SameSite=Lax`;
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Private demo · ELEVNSI</title>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:Geist,system-ui,sans-serif;background:#0a0c0b;color:#e8ebe8;display:grid;place-items:center;padding:24px 16px;
  background-image:radial-gradient(600px 300px at 50% 0%,rgba(181,255,36,.10),transparent 70%)}
.card{width:100%;max-width:440px;background:#101312;border:1px solid rgba(255,255,255,.09);border-radius:20px;padding:36px 28px;text-align:center}
.brand{display:inline-block;font-weight:600;letter-spacing:.24em;font-size:15px;margin-bottom:28px;color:#fff}
.brand b{color:#b5ff24;font-weight:600}
.lock{width:56px;height:56px;margin:0 auto 18px;border-radius:16px;display:grid;place-items:center;background:rgba(181,255,36,.1);color:#b5ff24}
h1{font-size:22px;line-height:1.25;margin:0 0 10px;color:#fff;font-weight:600}
p{margin:0 0 26px;color:#a6aea8;line-height:1.6;font-size:15px}
.actions{display:flex;flex-direction:column;gap:10px}
a.btn{display:block;padding:13px 18px;border-radius:12px;font-weight:500;text-decoration:none;font-size:15px}
.primary{background:#b5ff24;color:#101312}.primary:hover{box-shadow:0 0 0 4px rgba(181,255,36,.18)}
.ghost{color:#e8ebe8;border:1px solid rgba(255,255,255,.18)}.ghost:hover{border-color:#fff}
</style></head>
<body><main class="card">
<div class="brand">ELE<b>V</b>NSI</div>
<div class="lock" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
<h1>${esc(title)}</h1>
<p>${esc(text)}</p>
<div class="actions">
<a class="btn primary" href="/#contact">Request access</a>
<a class="btn ghost" href="/">Visit the ELEVNSI website</a>
</div>
</main></body></html>`, { status: 403, headers });
}
