// GET /api/slots : bookable dates, times and the slots already taken
import { json, fail, bookingsStore, bookableDates, slotFromKey } from '../lib/core.mjs';
import { BOOKING } from '../lib/config.mjs';

export default async () => {
  const dates = bookableDates();
  let blobs = [];
  try { ({ blobs } = await bookingsStore().list({ prefix: 'slot/' })); }
  catch (err) { console.error('[slots]', err); return fail(500, 'storage_error', 'Available times could not be loaded.'); }
  const window = new Set(dates);
  const taken = blobs.map((b) => slotFromKey(b.key)).filter((k) => k && window.has(k.slice(0, 10)));
  return json({
    dates,
    times: BOOKING.times,
    taken,
    durationMinutes: BOOKING.durationMinutes,
    timeZoneLabel: BOOKING.timeZoneLabel,
    format: BOOKING.format
  });
};

export const config = { path: '/api/slots' };
