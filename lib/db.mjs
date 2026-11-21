// Storage for leads, bookings and site settings: Upstash Redis over its REST API (no extra packages).
// Vercel → Storage → Upstash for Redis adds KV_REST_API_URL / KV_REST_API_TOKEN automatically;
// a database created on upstash.com gives UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Either works.

const env = (k) => process.env[k] || '';
const restUrl = () => (env('UPSTASH_REDIS_REST_URL') || env('KV_REST_API_URL')).replace(/\/$/, '');
const restToken = () => env('UPSTASH_REDIS_REST_TOKEN') || env('KV_REST_API_TOKEN');
export const dbConfigured = () => !!(restUrl() && restToken());
const isDeployed = () => ['production', 'preview'].includes(env('VERCEL_ENV'));

export class StorageError extends Error {}

async function redis(command) {
  let res;
  try {
    res = await fetch(restUrl(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${restToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });
  } catch (err) { throw new StorageError(`Redis unreachable: ${err.message}`); }
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok || data.error) throw new StorageError(`Redis error: ${data.error || res.status}`);
  return data.result;
}

// Local development without a database: in-memory only (lost on restart). Never used when deployed.
const memory = (globalThis.__elevnsiMemory ||= new Map());
function useMemory() {
  if (dbConfigured()) return false;
  if (isDeployed()) throw new StorageError('Storage is not configured: connect Upstash Redis to this Vercel project.');
  if (!globalThis.__elevnsiWarned) { console.warn('[db] No Redis configured, using temporary in-memory storage (local dev only).'); globalThis.__elevnsiWarned = true; }
  return true;
}

function makeStore(namespace) {
  const base = `elevnsi:${namespace}:`;
  const k = (key) => base + key;
  const parse = (v, type) => (v == null ? null : type === 'json' ? JSON.parse(v) : v);

  return {
    async get(key, opts = {}) {
      const v = useMemory() ? memory.get(k(key)) : await redis(['GET', k(key)]);
      return parse(v ?? null, opts.type);
    },
    async getManyJSON(keys) {
      if (!keys.length) return [];
      const vals = useMemory() ? keys.map((key) => memory.get(k(key)) ?? null) : await redis(['MGET', ...keys.map(k)]);
      return vals.map((v) => parse(v, 'json'));
    },
    async set(key, value) {
      if (useMemory()) { memory.set(k(key), String(value)); return; }
      await redis(['SET', k(key), String(value)]);
    },
    setJSON(key, obj) { return this.set(key, JSON.stringify(obj)); },
    /** Atomic "claim": stores the value only if the key doesn't exist yet. Returns true if stored. */
    async setIfAbsent(key, value) {
      if (useMemory()) { if (memory.has(k(key))) return false; memory.set(k(key), String(value)); return true; }
      return (await redis(['SET', k(key), String(value), 'NX'])) === 'OK';
    },
    async delete(key) {
      if (useMemory()) { memory.delete(k(key)); return; }
      await redis(['DEL', k(key)]);
    },
    /** Keys under a prefix, as { blobs: [{ key }] } (same shape the handlers already use). */
    async list({ prefix = '' } = {}) {
      if (useMemory()) {
        return { blobs: [...memory.keys()].filter((x) => x.startsWith(k(prefix))).map((x) => ({ key: x.slice(base.length) })) };
      }
      const found = new Set();
      let cursor = '0';
      do {
        const [next, keys] = await redis(['SCAN', cursor, 'MATCH', `${k(prefix)}*`, 'COUNT', '500']);
        keys.forEach((x) => found.add(x));
        cursor = String(next);
      } while (cursor !== '0');
      return { blobs: [...found].map((x) => ({ key: x.slice(base.length) })) };
    }
  };
}

export const leadsStore = () => makeStore('leads');
export const bookingsStore = () => makeStore('bookings');
export const siteStore = () => makeStore('site');
export const demoStore = () => makeStore('demo');
export const callsStore = () => makeStore('calls');
