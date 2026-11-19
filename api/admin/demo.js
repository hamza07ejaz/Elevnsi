// /api/admin/demo (admin only): personal invite links for the private console demo
//   GET                          list invites, newest first
//   POST {name, note, days}      create an invite (days: 1-90, or 0 for no expiry)
//   PATCH {code, revoked}        switch an invite off or on again
//   PATCH {code, days}           give an invite a new expiry, counted from today
//   DELETE ?code=                delete an invite
import {
  json, fail, readJson, route, isAdmin, demoStore, siteUrl, clean, newInviteCode, validInviteCode, inviteState
} from '../../lib/core.mjs';

const guard = (fn) => route(async (req) => (isAdmin(req) ? fn(req) : fail(401, 'unauthorized', 'Please sign in again.')));
const expiry = (days) => (days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null);
const validDays = (d) => Number.isInteger(d) && d >= 0 && d <= 90;
const view = (req, inv) => ({ ...inv, state: inviteState(inv), link: `${siteUrl(req)}/demo?k=${inv.code}` });

export const GET = guard(async (req) => {
  const store = demoStore();
  const { blobs } = await store.list({ prefix: 'invite/' });
  const invites = (await store.getManyJSON(blobs.map((b) => b.key))).filter(Boolean).map((i) => view(req, i));
  invites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return json({ invites });
});

export const POST = guard(async (req) => {
  const body = await readJson(req);
  const name = clean(body?.name, 80);
  const days = Number(body?.days ?? 7);
  if (!name) return fail(422, 'invalid', 'Please enter who this link is for.');
  if (!validDays(days)) return fail(422, 'invalid', 'Choose how long the link should work.');
  const inv = {
    code: newInviteCode(),
    name,
    note: clean(body?.note, 120),
    createdAt: new Date().toISOString(),
    expiresAt: expiry(days),
    revoked: false,
    views: 0,
    firstOpenedAt: null,
    lastOpenedAt: null
  };
  await demoStore().setJSON(`invite/${inv.code}`, inv);
  return json({ ok: true, invite: view(req, inv) });
});

export const PATCH = guard(async (req) => {
  const body = await readJson(req);
  if (!body || !validInviteCode(body.code)) return fail(422, 'invalid', 'Unknown invite.');
  const store = demoStore();
  const inv = await store.get(`invite/${body.code}`, { type: 'json' });
  if (!inv) return fail(404, 'not_found', 'This invite no longer exists.');
  if (typeof body.revoked === 'boolean') inv.revoked = body.revoked;
  if (body.days !== undefined) {
    const days = Number(body.days);
    if (!validDays(days)) return fail(422, 'invalid', 'Choose how long the link should work.');
    inv.expiresAt = expiry(days);
  }
  inv.updatedAt = new Date().toISOString();
  await store.setJSON(`invite/${inv.code}`, inv);
  return json({ ok: true, invite: view(req, inv) });
});

export const DELETE = guard(async (req) => {
  const code = new URL(req.url).searchParams.get('code');
  if (!validInviteCode(code)) return fail(422, 'invalid', 'Unknown invite.');
  await demoStore().delete(`invite/${code}`);
  return json({ ok: true });
});
