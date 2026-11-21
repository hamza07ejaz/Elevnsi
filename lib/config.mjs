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
  // Use a name from https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  // (e.g. America/Chicago for Central, America/Denver for Mountain, America/Los_Angeles for Pacific).
  // Daylight saving is handled automatically.
  timeZone: 'America/New_York',
  timeZoneLabel: 'Eastern Time (ET)',
  durationMinutes: 30,
  daysAhead: 10,                     // how many working days customers can choose from
  workDays: [1, 2, 3, 4, 5],         // 0 = Sun … 6 = Sat
  times: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
  format: 'Video call (we email you the meeting link before the call)'
};
