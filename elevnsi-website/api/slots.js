// GET /api/slots : bookable dates, times and the slots already taken
import { json, route, bookingsStore, bookableDates, slotFromKey } from '../lib/core.mjs';
import { BOOKING } from '../lib/config.mjs';

export const GET = route(async () => {
  const dates = bookableDates();
  const { blobs } = await bookingsStore().list({ prefix: 'slot/' });
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
});
