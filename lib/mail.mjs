// Email sending + templates for ELEVNSI
// Works with Gmail / any SMTP (SMTP_USER + SMTP_PASS) or Resend (RESEND_API_KEY).
import nodemailer from 'nodemailer';
import { env, slotStart } from './core.mjs';
import { BOOKING, BUSINESS } from './config.mjs';

export const mailConfigured = () => !!(env('RESEND_API_KEY') || (env('SMTP_USER') && env('SMTP_PASS')));
const fromAddress = () => env('MAIL_FROM') || `${BUSINESS.name} <${env('SMTP_USER') || 'onboarding@resend.dev'}>`;

let transport;
export async function sendMail({ to, subject, html, text, replyTo, ics }) {
  if (!to) return false;
  if (env('RESEND_API_KEY')) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress(), to: [to], subject, html, text,
        reply_to: replyTo || undefined,
        attachments: ics ? [{ filename: 'elevnsi-consultation.ics', content: Buffer.from(ics).toString('base64') }] : undefined
      })
    });
    if (!res.ok) console.error('[mail] Resend error', res.status, await res.text());
    return res.ok;
  }
  if (env('SMTP_USER') && env('SMTP_PASS')) {
    const port = Number(env('SMTP_PORT', '465'));
    transport ||= nodemailer.createTransport({
      host: env('SMTP_HOST', 'smtp.gmail.com'), port, secure: port === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') }
    });
    await transport.sendMail({
      from: fromAddress(), to, subject, html, text, replyTo,
      icalEvent: ics ? { method: 'PUBLISH', filename: 'elevnsi-consultation.ics', content: ics } : undefined
    });
    return true;
  }
  console.log('[mail] Email not configured, skipped:', subject, '->', to);
  return false;
}

/* ---------- Calendar invite (.ics) ---------- */
const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
export function bookingIcs(lead, siteUrl) {
  const start = slotStart(lead.date, lead.time);
  const end = new Date(start.getTime() + BOOKING.durationMinutes * 60000);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ELEVNSI//Consultation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${lead.id}@elevnsi`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`${BUSINESS.name} free consultation`)}`,
    `DESCRIPTION:${icsEscape(`Free ${BOOKING.durationMinutes}-minute consultation with ${BUSINESS.name}.\nTopic: ${lead.service || 'AI automation'}\n${BOOKING.format}\n${siteUrl}`)}`,
    `URL:${siteUrl}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(`${BUSINESS.name} consultation in 30 minutes`)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}

/* ---------- Templates ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tzShort = () => (/\(([^)]+)\)/.exec(BOOKING.timeZoneLabel) || [])[1] || '';
const firstName = (n) => esc(String(n || '').trim().split(/\s+/)[0] || 'there');

const btn = (href, label, primary = true) => `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${primary ? '#b5ff24' : '#ffffff'};color:#101312;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:10px;border:1px solid ${primary ? '#b5ff24' : '#d5d9d3'}">${esc(label)}</a>`;

function layout({ preheader, title, body, cta, cta2, siteUrl }) {
  const home = siteUrl || '';
  const icon = /^https:\/\//.test(home) ? `${home}/assets/img/elevnsi-icon-192.png` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f4f1;font-family:Arial,Helvetica,sans-serif;color:#101312">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f1;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e6e2">
<tr><td style="background:#0a0c0b;padding:18px 28px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    ${icon ? `<td style="padding-right:12px;vertical-align:middle"><a href="${esc(home)}"><img src="${esc(icon)}" width="40" height="40" alt="ELEVNSI" style="display:block;width:40px;height:40px;border:0;border-radius:10px"></a></td>` : ''}
    <td style="vertical-align:middle"><span style="font-size:18px;font-weight:bold;letter-spacing:5px;color:#ffffff">ELE<span style="color:#b5ff24">V</span>NSI</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:32px 28px 8px">
  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#101312">${esc(title)}</h1>
  ${body}
</td></tr>
${cta || cta2 ? `<tr><td style="padding:8px 28px 24px">${cta ? btn(cta.href, cta.label) : ''}${cta2 ? btn(cta2.href, cta2.label, false) : ''}</td></tr>` : ''}
<tr><td style="padding:20px 28px;border-top:1px solid #e4e6e2;font-size:12px;line-height:1.6;color:#6b726d">
  <strong style="color:#101312">${esc(BUSINESS.name)}</strong> · ${esc(BUSINESS.tagline)}${home ? `<br><a href="${esc(home)}" style="color:#6b726d">${esc(home.replace(/^https?:\/\//, ''))}</a>` : ''}
</td></tr>
</table></td></tr></table></body></html>`;
}

/** The slot in the customer's own time zone, e.g. "Wednesday, December 2 at 9:00 PM (Asia/Karachi)", or '' if it's the same as ours. */
function customerLocalTime(lead) {
  const tz = String(lead.timezone || '');
  if (!tz || tz === BOOKING.timeZone || !lead.date || !lead.time) return '';
  try {
    const at = slotStart(lead.date, lead.time);
    const mine = at.toLocaleString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const ours = at.toLocaleString('en-US', { timeZone: BOOKING.timeZone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return mine === ours ? '' : `${mine} (${tz.replace(/_/g, ' ')})`;
  } catch { return ''; }
}

/** "Add to Google Calendar" link for a booking. */
function googleCalendarUrl(lead, siteUrl) {
  const start = slotStart(lead.date, lead.time);
  const end = new Date(start.getTime() + BOOKING.durationMinutes * 60000);
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: `${BUSINESS.name} free consultation`, dates: `${icsDate(start)}/${icsDate(end)}`,
    details: `Free ${BOOKING.durationMinutes}-minute consultation with ${BUSINESS.name}.\nTopic: ${lead.service || 'AI automation'}\n${BOOKING.format}\n${siteUrl}`
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3a413c">${t}</p>`;
const table = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f8f8f6;border-radius:12px">
${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:10px 16px;font-size:13px;color:#6b726d;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 16px;font-size:14px;color:#101312;font-weight:bold;vertical-align:top;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}
</table>`;
const textRows = (rows) => rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

/** Email to the customer */
export function customerEmail(lead, siteUrl) {
  if (lead.source === 'booking') {
    const rows = [['Date & time', `${lead.slotLabel}`], ['Time zone', BOOKING.timeZoneLabel], ['Your local time', customerLocalTime(lead)], ['Length', `${BOOKING.durationMinutes} minutes`], ['Format', BOOKING.format], ['Topic', lead.service]];
    const gcal = lead.date && lead.time ? googleCalendarUrl(lead, siteUrl) : '';
    return {
      subject: `Your ${BUSINESS.name} consultation is booked: ${lead.slotLabel} ${tzShort()}`.trim(),
      html: layout({
        siteUrl,
        preheader: `You're booked for ${lead.slotLabel} ${tzShort()}.`,
        title: `You're booked, ${firstName(lead.full_name)}!`,
        body: p(`Thanks for booking a free consultation with ${esc(BUSINESS.name)}. Here are your details:`) + table(rows) +
          p('A calendar invite is attached, so you can add it to your calendar in one click.') +
          p('Need a different time? Just reply to this email and we\'ll rearrange it.'),
        cta: gcal ? { label: 'Add to Google Calendar', href: gcal } : { label: 'Visit our website', href: siteUrl },
        cta2: gcal ? { label: 'Visit our website', href: siteUrl } : null
      }),
      text: `Hi ${lead.full_name},\n\nYour free consultation with ${BUSINESS.name} is booked.\n\n${textRows(rows)}\n\nA calendar invite is attached.${gcal ? `\nAdd to Google Calendar: ${gcal}` : ''}\nNeed a different time? Reply to this email.\n\n${BUSINESS.name}\n${siteUrl}`
    };
  }
  const rows = [['Service', lead.service], ['Your message', lead.message]];
  return {
    subject: `We received your message, ${String(lead.full_name || '').split(' ')[0] || 'thanks'}`,
    html: layout({
      siteUrl,
      preheader: 'Thanks for contacting ELEVNSI. We\'ll reply within one business day.',
      title: `Thanks, ${firstName(lead.full_name)}. We got your message.`,
      body: p(`Our team will get back to you within one business day. Here's a copy of what you sent:`) + table(rows) +
        p('Want to talk sooner? Book a free consultation at a time that suits you.'),
      cta: { label: 'Book a free consultation', href: `${siteUrl}/#book` }
    }),
    text: `Hi ${lead.full_name},\n\nThanks for contacting ${BUSINESS.name}. We'll reply within one business day.\n\n${textRows(rows)}\n\nBook a free consultation: ${siteUrl}/#book`
  };
}

/** Summary of an AI phone call, to the ELEVNSI team */
export function callSummaryEmail(call, siteUrl) {
  const d = call.details || {};
  const mins = call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : '';
  const who = call.name || d.full_name || call.number || 'Unknown caller';
  const outcome = { booked: 'Consultation booked', transferred: 'Transferred to the team', voicemail: 'Voicemail', 'no-answer': 'No answer', failed: 'Call failed', completed: 'Completed' }[call.outcome] || 'Completed';
  const rows = [
    ['Outcome', outcome + (call.slotLabel ? ` · ${call.slotLabel}` : '')],
    ['Direction', call.direction === 'outbound' ? 'Outgoing (AI called them)' : 'Incoming'],
    ['Caller', who], ['Phone', call.number], ['Business', d.business_name], ['Email', d.email],
    ['Needs', d.needs], ['Timeline', d.timeline], ['Interest', d.interest && `${d.interest}${call.score !== undefined ? ` (score ${call.score})` : ''}`],
    ['Follow-up', d.follow_up], ['Length', mins], ['Summary', call.summary]
  ];
  return {
    subject: `AI call: ${who} · ${outcome}`,
    html: layout({
      siteUrl,
      preheader: call.summary || `${outcome} with ${who}`,
      title: call.direction === 'outbound' ? 'AI outgoing call finished' : 'New call answered by your AI',
      body: table(rows) + p('The full transcript and recording are in the admin panel under AI Calls.'),
      cta: { label: 'Open AI Calls', href: `${siteUrl}/#admin` }
    }),
    text: `${outcome} with ${who}\n\n${textRows(rows)}\n\nTranscript and recording: ${siteUrl}/#admin`
  };
}

/** Notification to the ELEVNSI team */
export function adminEmail(lead, siteUrl) {
  const booking = lead.source === 'booking';
  const rows = [
    ['Type', booking ? 'Consultation booking' : 'Contact form'],
    ...(booking ? [['Consultation', `${lead.slotLabel} (${BOOKING.timeZoneLabel})`]] : []),
    ['Name', lead.full_name], ['Business', lead.business_name], ['Email', lead.email], ['Phone', lead.phone],
    ['Service', lead.service], ['Message', lead.message], ['Customer time zone', lead.timezone]
  ];
  return {
    subject: booking ? `New booking: ${lead.full_name} · ${lead.slotLabel}` : `New lead: ${lead.full_name} (${lead.business_name || 'no business'})`,
    html: layout({
      siteUrl,
      preheader: booking ? `New consultation booked for ${lead.slotLabel}` : `New inquiry from ${lead.full_name}`,
      title: booking ? 'New consultation booked' : 'New website lead',
      body: table(rows) + p('Reply to this email to answer the customer directly.'),
      cta: { label: 'Open admin panel', href: `${siteUrl}/#admin` }
    }),
    text: `${booking ? 'New consultation booked' : 'New website lead'}\n\n${textRows(rows)}\n\nAdmin panel: ${siteUrl}/#admin`
  };
}
