/*
 * Business settings used by the backend (bookings and emails).
 * Edit these values, then deploy again.
 */
export const BUSINESS = {
  name: 'ELEVNSI',
  tagline: 'Intelligent Automation. Limitless Possibilities.'
};

export const BOOKING = {
  // Your business time zone. Slots are shown and booked in this time zone.
  timeZoneLabel: 'Pakistan Standard Time (PKT)',
  utcOffset: '+05:00',               // fixed offset for the zone above (PKT has no daylight saving)
  durationMinutes: 30,
  daysAhead: 10,                     // how many working days customers can choose from
  workDays: [1, 2, 3, 4, 5],         // 0 = Sun … 6 = Sat
  times: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  format: 'Video call (we email you the meeting link before the call)'
};
