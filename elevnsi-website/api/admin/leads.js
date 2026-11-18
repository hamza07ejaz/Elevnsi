// /api/admin/leads (admin only)
//   GET                 list all leads, newest first
//   PATCH {id, status}  change a lead's status
//   DELETE ?id=         delete a lead (and free its booking slot)
import { json, fail, readJson, route, isAdmin, leadsStore, bookingsStore, slotKey } from '../../lib/core.mjs';

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const validId = (id) => typeof id === 'string' && /^[a-z0-9]{8,40}$/.test(id);
const guard = (fn) => route(async (req) => (isAdmin(req) ? fn(req) : fail(401, 'unauthorized', 'Please sign in again.')));

export const GET = guard(async () => {
  const store = leadsStore();
  const { blobs } = await store.list({ prefix: 'lead/' });
  const leads = (await store.getManyJSON(blobs.map((b) => b.key))).filter(Boolean);
  leads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return json({ leads });
});

export const PATCH = guard(async (req) => {
  const body = await readJson(req);
  if (!body || !validId(body.id) || !STATUSES.includes(body.status)) return fail(422, 'invalid', 'Unknown lead or status.');
  const store = leadsStore();
  const lead = await store.get(`lead/${body.id}`, { type: 'json' });
  if (!lead) return fail(404, 'not_found', 'This lead no longer exists.');
  lead.status = body.status;
  lead.updatedAt = new Date().toISOString();
  await store.setJSON(`lead/${body.id}`, lead);
  return json({ ok: true, lead });
});

export const DELETE = guard(async (req) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!validId(id)) return fail(422, 'invalid', 'Unknown lead.');
  const store = leadsStore();
  const lead = await store.get(`lead/${id}`, { type: 'json' });
  if (lead?.source === 'booking' && lead.date && lead.time) {
    const bookings = bookingsStore();
    const key = slotKey(lead.date, lead.time);
    if ((await bookings.get(key)) === id) await bookings.delete(key);
  }
  await store.delete(`lead/${id}`);
  return json({ ok: true });
});
