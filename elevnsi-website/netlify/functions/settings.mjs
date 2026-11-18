// GET /api/settings : public contact details shown on the website
// PUT /api/settings : update them (admin only)
import { json, fail, readJson, isAdmin, siteStore, getContactSettings, clean, cleanText, isEmail } from '../lib/core.mjs';

const FIELDS = {
  email: 254, whatsapp: 40, whatsappMessage: 300, phone: 40, address: 200, hours: 120,
  linkedin: 300, instagram: 300, facebook: 300
};
const URL_FIELDS = ['linkedin', 'instagram', 'facebook'];

export default async (req) => {
  if (req.method === 'GET') return json(await getContactSettings());
  if (req.method !== 'PUT') return fail(405, 'method_not_allowed');
  if (!isAdmin(req)) return fail(401, 'unauthorized', 'Please sign in again.');

  const body = await readJson(req);
  if (!body) return fail(400, 'invalid_json');
  const data = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    data[k] = k === 'whatsappMessage' ? cleanText(body[k], max) : clean(body[k], max);
  }
  if (data.email && !isEmail(data.email)) return fail(422, 'invalid', 'Please enter a valid business email.');
  for (const k of URL_FIELDS) {
    if (data[k] && !/^https:\/\/[^\s]+$/i.test(data[k])) return fail(422, 'invalid', `The ${k} link must start with https://`);
  }
  data.updatedAt = new Date().toISOString();
  await siteStore().setJSON('contact', data);
  return json({ ok: true, settings: data });
};

export const config = { path: '/api/settings' };
