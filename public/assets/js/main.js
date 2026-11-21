/* ELEVNSI — site behaviour (no dependencies) */
(() => {
  const CFG = window.ELEVNSI_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Google Analytics 4 (loads only when an ID is set) ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  if (CFG.gaMeasurementId) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.gaMeasurementId);
    document.head.append(s);
    gtag('js', new Date());
    gtag('config', CFG.gaMeasurementId);
  }
  const track = (name, params = {}) => { try { gtag('event', name, params); } catch (_) {} };

  /* ---------- Contact details (config.js defaults, overridden by Admin settings) ---------- */
  const contact = {
    email: CFG.email || '', linkedin: CFG.linkedinUrl || '', whatsapp: CFG.whatsapp || '',
    whatsappMessage: CFG.whatsappMessage || '', phone: CFG.phone || '', address: CFG.address || '',
    hours: CFG.hours || '', instagram: CFG.instagram || '', facebook: CFG.facebook || ''
  };
  const digits = (s) => String(s || '').replace(/[^\d]/g, '');
  function applyContact(saved = {}) {
    Object.entries(saved).forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) contact[k] = v.trim(); });
    const c = contact;
    $$('[data-email-link]').forEach((a) => (a.href = 'mailto:' + c.email));
    $$('[data-email-text]').forEach((el) => (el.textContent = c.email));
    $$('[data-linkedin]').forEach((a) => (a.href = c.linkedin || '#'));
    $$('[data-href]').forEach((a) => (a.href = c[a.dataset.href] || '#'));
    const wa = digits(c.whatsapp);
    const waText = c.whatsappMessage || "Hi ELEVNSI, I'd like to learn more about your AI automation solutions.";
    $$('[data-wa-link]').forEach((a) => (a.href = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : '#'));
    $$('[data-tel-link]').forEach((a) => (a.href = 'tel:' + String(c.phone || '').replace(/[^\d+]/g, '')));
    $$('[data-text]').forEach((el) => (el.textContent = c[el.dataset.text] || ''));
    $$('[data-show]').forEach((el) => (el.hidden = !String(c[el.dataset.show] || '').trim()));
  }
  applyContact();
  window.ElevStore?.watchContact(applyContact);
  window.ElevStore?.access().then((a) => { if (a.mode === 'live' && a.canAdmin) $$('.admin-entry').forEach((el) => (el.hidden = false)); });
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Header: scrolled state ---------- */
  const header = $('.site-header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const nav = $('#main-nav');
  const setMenu = (open) => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', (e) => { if (e.target.closest('a, button')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => e.matches && setMenu(false));

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.main-nav a[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if (sections.length) {
    let ticking = false;
    const updateActive = () => {
      ticking = false;
      const mid = innerHeight * 0.45;
      let current = null;
      sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) current = s; });
      navLinks.forEach((a) => {
        if (current && a.getAttribute('href') === '#' + current.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateActive); } }, { passive: true });
    updateActive();
  }

  /* ---------- Scroll reveal fallback (native CSS scroll-driven animation preferred) ---------- */
  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)') && !reduceMotion && 'IntersectionObserver' in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.reveal').forEach((el) => ro.observe(el));
  }

  /* ---------- Hero demo: the assistant books an appointment, on a loop ---------- */
  const heroChat = $('#hero-chat');
  if (heroChat) {
    const steps = $$('[data-step]', heroChat);
    if (reduceMotion) {
      steps.forEach((s) => s.classList.add('show', 'done'));
    } else {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let visible = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(heroChat);
      const ready = async () => { while (!visible || document.hidden) await wait(400); };
      (async function loop() {
        for (;;) {
          steps.forEach((s) => s.classList.remove('show', 'done'));
          await wait(700);
          for (const s of steps) {
            await ready();
            s.classList.add('show');
            if (s.hasAttribute('data-typing')) { await wait(1300); s.classList.add('done'); }
            else await wait(s.classList.contains('in') ? 1100 : 1500);
          }
          await wait(4500);
          steps.forEach((s) => s.classList.remove('show'));
          await wait(600);
        }
      })();
    }
  }

  /* ---------- Mock conversations play when they scroll into view ---------- */
  $$('.mock').forEach((m) => {
    [...m.querySelectorAll('.bubble, .slot-row, .lead-card, .handoff, .mock-foot')].forEach((el, i) => el.style.setProperty('--i', i));
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const mo = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('play'); mo.unobserve(en.target); } });
    }, { threshold: 0.35 });
    $$('.mock').forEach((m) => mo.observe(m));
  } else {
    $$('.mock').forEach((m) => m.classList.add('play'));
  }

  /* ---------- System diagram: data packets travelling along each connection ---------- */
  const diagram = $('#system-diagram');
  if (diagram) {
    if (reduceMotion) {
      diagram.pauseAnimations?.();
    } else {
      const NS = 'http://www.w3.org/2000/svg';
      $$('.flow', diagram).forEach((path, i) => {
        path.id = path.id || `dg-path-${i}`;
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('r', '4');
        dot.setAttribute('class', 'dg-packet');
        const anim = document.createElementNS(NS, 'animateMotion');
        anim.setAttribute('dur', `${(2.2 + (i % 4) * 0.35).toFixed(2)}s`);
        anim.setAttribute('begin', `${((i * 0.37) % 2).toFixed(2)}s`);
        anim.setAttribute('repeatCount', 'indefinite');
        anim.setAttribute('rotate', 'auto');
        const mp = document.createElementNS(NS, 'mpath');
        mp.setAttribute('href', '#' + path.id);
        anim.append(mp); dot.append(anim);
        diagram.append(dot);
      });
      // Pause the diagram while it is off-screen to save battery
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => (en.isIntersecting ? diagram.unpauseAnimations?.() : diagram.pauseAnimations?.())).observe(diagram);
      }
    }
  }

  /* ---------- Form validation helpers (aria-invalid in sync with :user-invalid) ---------- */
  const linkError = (el, shown) => {
    const id = el.dataset.error; if (!id) return;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== id);
    if (shown) ids.push(id);
    ids.length ? el.setAttribute('aria-describedby', ids.join(' ')) : el.removeAttribute('aria-describedby');
  };
  const isShownInvalid = (el) => {
    const form = el.form;
    let userInvalid = false;
    try { userInvalid = el.matches(':user-invalid'); } catch (_) {}
    return userInvalid || (form?.classList.contains('was-submitted') && !el.validity.valid);
  };
  const syncAria = (el) => {
    if (!el.matches?.('.input')) return;
    const invalid = isShownInvalid(el);
    el.setAttribute('aria-invalid', String(invalid));
    linkError(el, invalid);
  };
  $$('.input').forEach(syncAria);
  ['blur', 'input', 'change'].forEach((t) => document.addEventListener(t, (e) => syncAria(e.target), true));

  const validate = (form) => {
    form.classList.add('was-submitted');
    const fields = $$('.input', form);
    fields.forEach(syncAria);
    const firstBad = fields.find((f) => !f.validity.valid);
    if (firstBad) { firstBad.focus(); return false; }
    return true;
  };

  /* ---------- Submission ---------- */
  const S = window.ElevStore;
  let storeMode = 'local';
  const modeReady = S ? S.mode().then((m) => (storeMode = m)) : Promise.resolve('local');
  const friendlyCodes = ['slot_taken', 'invalid', 'network'];

  /** Saves a lead. Resolves {ok, slotLabel?, customerEmailed?} or throws {code, message}. */
  async function send(payload) {
    if (payload._gotcha) return { ok: true }; // honeypot: silently drop bots
    const { _gotcha, _subject, ...lead } = payload;
    lead.source = lead.source === 'booking' ? 'booking' : 'contact';
    await modeReady;
    // Site backend (/api): saves the lead, emails the customer and your team
    if (storeMode === 'api') return S.addLead(lead);

    // Claude link (shared database) or local preview (this browser)
    let stored = false;
    try { await S?.addLead(lead); stored = true; } catch (err) { console.warn('[ELEVNSI] Lead not stored', err); }
    if (CFG.contactFormEndpoint) {
      const res = await fetch(CFG.contactFormEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...lead, _subject })
      });
      if (!res.ok) throw { code: 'http_' + res.status };
      return { ok: true };
    }
    if (!stored) await new Promise((r) => setTimeout(r, 500));
    return { ok: true, demo: true };
  }
  const errorText = (err, fallback) => (err && friendlyCodes.includes(err.code) && err.message) || fallback;

  const setBusy = (btn, busy, label) => {
    if (!btn) return;
    if (busy) { btn.dataset.label = btn.innerHTML; btn.setAttribute('aria-busy', 'true'); btn.textContent = label; }
    else { btn.removeAttribute('aria-busy'); if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  };
  const showError = (form, msg) => {
    const box = $('.form-status', form);
    if (!box) return;
    box.textContent = msg;
    box.classList.toggle('is-error', !!msg);
  };

  /* Contact form */
  const contactForm = $('#contact-form');
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(contactForm, '');
    if (!validate(contactForm)) return;
    const btn = $('button[type="submit"]', contactForm);
    const data = Object.fromEntries(new FormData(contactForm));
    if (data.call_consent && !String(data.phone || '').trim()) {
      showError(contactForm, 'Add your phone number so our AI assistant can call you back, or untick “Call me back now”.');
      $('#cf-phone', contactForm)?.focus();
      return;
    }
    data._subject = `New website inquiry: ${data.full_name} (${data.business_name})`;
    setBusy(btn, true, 'Sending…');
    try {
      const r = await send(data);
      track('generate_lead', { form: 'contact', service: data.service });
      const emailed = r.customerEmailed ? `We've emailed a copy to ${data.email}. ` : '';
      $('#contact-success-text').textContent = r.callback === 'calling'
        ? `${emailed}Our AI assistant is calling you now on ${data.phone}. Please keep your phone nearby.`
        : r.callback === 'outside-hours'
          ? `${emailed}It's outside our calling hours right now, so our team will call you back during business hours.`
          : `${emailed}Our team will get back to you within one business day.`;
      contactForm.hidden = true;
      const ok = $('.form-success', contactForm.parentElement);
      ok.hidden = false; ok.focus();
    } catch (err) {
      showError(contactForm, errorText(err, `Sorry, something went wrong sending your message. Please try again or email us at ${contact.email || 'our team'}.`));
    } finally { setBusy(btn, false); }
  });

  /* ---------- Booking dialog ---------- */
  const dialog = $('#booking-dialog');
  const embed = $('#booking-embed');
  const picker = $('#booking-picker');
  const success = $('#booking-success');
  let embedLoaded = false;

  function buildEmbedUrl(url) {
    try {
      const u = new URL(url);
      if (/calendly\.com$/.test(u.hostname)) {
        u.searchParams.set('embed_domain', location.hostname || 'localhost');
        u.searchParams.set('embed_type', 'Inline');
        u.searchParams.set('hide_gdpr_banner', '1');
      } else if (/cal\.com$/.test(u.hostname)) {
        u.searchParams.set('embed', 'true');
      }
      return u.toString();
    } catch (_) { return url; }
  }

  function openBooking(service) {
    if (!dialog) return;
    if (CFG.bookingUrl) {
      picker.hidden = true; success.hidden = true; embed.hidden = false;
      if (!embedLoaded) {
        const f = document.createElement('iframe');
        f.src = buildEmbedUrl(CFG.bookingUrl);
        f.title = 'Book a consultation with ELEVNSI';
        f.loading = 'lazy';
        embed.append(f);
        embedLoaded = true;
      }
    } else {
      if (!success.hidden) resetPicker();
      if (service) { const sel = $('#bk-service'); if (sel) sel.value = service; }
      loadSlots();
    }
    dialog.showModal();
    track('booking_open', { service: service || 'general' });
  }
  // Links like yoursite/#book (used in emails) open the booking window
  if (location.hash === '#book') setTimeout(() => { openBooking(); history.replaceState(null, '', location.pathname + location.search); }, 400);

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (!t) return;
    e.preventDefault();
    openBooking(t.dataset.service);
  });

  // Light-dismiss fallback where <dialog closedby> is unsupported (Safari)
  if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let downOutside = false;
    dialog.addEventListener('pointerdown', (e) => { downOutside = outside(e); });
    dialog.addEventListener('pointerup', (e) => { if (downOutside && outside(e)) dialog.close(); });
  }

  /* Built-in slot picker (live availability from the site backend, or a preview calendar) */
  const bk = Object.assign({ daysAhead: 10, times: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'], workDays: [1, 2, 3, 4, 5] }, CFG.booking || {});
  const dateStrip = $('#date-strip');
  const timeGrid = $('#time-grid');
  const summary = $('#picker-summary span');
  const state = { date: null, time: null };
  let server = null;          // { dates, times, taken:Set, timeZoneLabel, durationMinutes } in api mode
  let slotsError = '';
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const fmtNum = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
  const fmtMon = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const to12 = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const times = () => (server ? server.times : bk.times);
  // Visitor's own clock for a business-time slot, e.g. "9:00 PM your time" (empty when they share the business time zone)
  const myZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoneOffset = (at, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(at.getTime() / 60000) * 60000) / 60000;
  };
  const tzAbbr = () => { const m = /\(([^)]+)\)/.exec(server?.timeZoneLabel || ''); return m ? ' ' + m[1] : ''; };
  function yourTime(date, t) {
    if (!server?.timeZone || server.timeZone === myZone) return '';
    try {
      const wall = Date.parse(`${date}T${t}:00Z`);
      const at = new Date(wall - zoneOffset(new Date(wall - zoneOffset(new Date(wall), server.timeZone) * 60000), server.timeZone) * 60000);
      if (zoneOffset(at, server.timeZone) === zoneOffset(at, myZone)) return '';
      const sameDay = at.toLocaleDateString('en-CA') === date;
      return at.toLocaleString(undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' your time';
    } catch { return ''; }
  }
  const isTaken = (date, t, i) => (server ? server.taken.has(`${date}T${t}`) : (parseInt(date.slice(-2), 10) + i) % 5 === 0);

  async function loadSlots() {
    await modeReady;
    if (storeMode !== 'api') return;
    slotsError = '';
    if (!server) { dateStrip.innerHTML = '<p class="picker-tz">Loading available times…</p>'; timeGrid.innerHTML = ''; }
    try {
      const s = await S.getSlots();
      server = { ...s, taken: new Set(s.taken || []) };
    } catch (err) {
      slotsError = 'We couldn’t load available times. Please try again, or send us a message with the contact form.';
    }
    if (state.date && server && !server.dates.includes(state.date)) state.date = state.time = null;
    if (state.date && state.time && server?.taken.has(`${state.date}T${state.time}`)) state.time = null;
    buildDates(); buildTimes(); updateSummary();
  }

  function localDates() {
    const out = [];
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    while (out.length < bk.daysAhead) { if (bk.workDays.includes(d.getDay())) out.push(iso(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function buildDates() {
    if (!dateStrip) return;
    if (storeMode === 'api' && !server) { dateStrip.innerHTML = `<p class="picker-tz">${slotsError || 'Loading available times…'}</p>`; return; }
    dateStrip.innerHTML = '';
    (server ? server.dates : localDates()).forEach((ds) => {
      const d = fromIso(ds);
      const full = times().every((t, i) => isTaken(ds, t, i));
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.dataset.date = ds;
      b.dataset.label = fmtLong.format(d);
      b.setAttribute('aria-pressed', String(state.date === ds));
      b.setAttribute('aria-label', fmtLong.format(d) + (full ? ', fully booked' : ''));
      b.disabled = full;
      b.innerHTML = `<small>${fmtDay.format(d)}</small><strong>${fmtNum.format(d)}</strong><small>${fmtMon.format(d)}</small>`;
      dateStrip.append(b);
    });
  }
  function buildTimes() {
    if (!timeGrid) return;
    timeGrid.innerHTML = '';
    if (storeMode === 'api' && !server) return;
    times().forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.time = t;
      b.textContent = to12(t);
      b.setAttribute('aria-pressed', String(state.time === t));
      if (!state.date) b.disabled = true;
      else if (isTaken(state.date, t, i)) { b.disabled = true; b.setAttribute('aria-label', `${to12(t)}, already booked`); }
      timeGrid.append(b);
    });
    const hint = server && state.date ? yourTime(state.date, times()[0]) : '';
    const tzText = server ? `Times shown in ${server.timeZoneLabel}.${hint ? ` ${to12(times()[0])}${tzAbbr()} is ${hint}.` : ''}` : `Times shown in your time zone (${myZone}).`;
    $('#picker-tz').textContent = state.date ? tzText : 'Pick a date to see available times.';
  }
  function updateSummary() {
    const dBtn = state.date && $(`[data-date="${state.date}"]`, dateStrip);
    const mins = server?.durationMinutes || 30;
    summary.textContent = state.date && state.time && dBtn
      ? `${dBtn.dataset.label} at ${to12(state.time)}${tzAbbr()}${yourTime(state.date, state.time) ? ` (${yourTime(state.date, state.time)})` : ''} · ${mins}-minute video call`
      : state.date ? 'Now choose a time.' : 'Select a date and time to continue.';
    $('#bk-date').value = state.date || '';
    $('#bk-time').value = state.time || '';
  }
  function resetPicker() {
    state.date = state.time = null;
    picker.reset(); picker.classList.remove('was-submitted');
    $$('.input', picker).forEach(syncAria);
    showError(picker, '');
    buildDates(); buildTimes(); updateSummary();
    picker.hidden = false; success.hidden = true;
  }
  dateStrip?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-date]'); if (!b) return;
    $$('[data-date]', dateStrip).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    state.date = b.dataset.date; state.time = null;
    buildTimes(); updateSummary();
  });
  timeGrid?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-time]'); if (!b || b.disabled) return;
    $$('[data-time]', timeGrid).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    state.time = b.dataset.time; updateSummary();
  });
  picker?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(picker, '');
    if (!state.date || !state.time) {
      showError(picker, 'Please choose a date and time for your consultation.');
      (state.date ? timeGrid : dateStrip).querySelector('button:not(:disabled)')?.focus();
      return;
    }
    if (!validate(picker)) return;
    const btn = $('button[type="submit"]', picker);
    $('#bk-tz').value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('#bk-slot').value = summary.textContent;
    const data = Object.fromEntries(new FormData(picker));
    data._subject = `New consultation booking: ${data.full_name} (${data.business_name}), ${data.requested_slot}`;
    setBusy(btn, true, 'Booking…');
    try {
      const r = await send(data);
      track('generate_lead', { form: 'booking', service: data.service });
      const when = r.slotLabel ? `${r.slotLabel}${r.timeZoneLabel ? `, ${r.timeZoneLabel}` : ''}` : data.requested_slot.split(' · ')[0];
      $('#booking-success-text').textContent = r.customerEmailed
        ? `You're booked for ${when}. A confirmation email with a calendar invite is on its way to ${data.email}.`
        : `You're booked for ${when}. We'll email ${data.email} to confirm.`;
      if (server) server.taken.add(`${data.date}T${data.time}`);
      picker.hidden = true; success.hidden = false; success.focus();
    } catch (err) {
      showError(picker, errorText(err, `Sorry, we couldn't complete your booking. Please try again or email ${contact.email || 'our team'}.`));
      if (err && err.code === 'slot_taken') { state.time = null; loadSlots(); }
    } finally { setBusy(btn, false); }
  });
  if (picker) { buildDates(); buildTimes(); updateSummary(); }
})();
