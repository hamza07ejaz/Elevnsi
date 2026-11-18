// POST /api/admin/login : exchange the admin password for a 12-hour session token
import { json, fail, readJson, env, checkPassword, makeToken } from '../lib/core.mjs';

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  if (!env('ADMIN_PASSWORD')) return fail(503, 'not_configured', 'The admin password has not been set yet.');
  const body = await readJson(req);
  if (!body || !checkPassword(body.password || '')) {
    await new Promise((r) => setTimeout(r, 900)); // slow down guessing
    return fail(401, 'wrong_password', 'That password is not correct.');
  }
  return json({ token: makeToken(12), expiresInHours: 12 });
};

export const config = { path: '/api/admin/login' };
