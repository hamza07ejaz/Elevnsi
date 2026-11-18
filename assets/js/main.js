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
  // True on a real web host (e.g. Netlify), false on localhost / opened as a file
  const onWebHost = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  async function send(form, payload) {
    if (payload._gotcha) return { ok: true }; // honeypot: silently drop bots
    delete payload._gotcha;
    const mode = window.ElevStore ? await window.ElevStore.mode() : 'local';
    const useNetlify = !!CFG.netlifyForms && mode !== 'live' && onWebHost;

    // Admin-panel leads list: the shared database on the Claude link, or this browser in local preview
    let stored = false;
    if (mode === 'live' || !useNetlify) {
      try {
        const { _subject, subject, source, 'form-name': _fn, ...lead } = payload;
        await window.ElevStore?.addLead({ ...lead, source: source === 'Consultation booking' ? 'booking' : 'contact' });
        stored = true;
      } catch (err) { console.warn('[ELEVNSI] Lead not stored', err); }
    }

    // Netlify Forms: submissions appear in Netlify (Forms) and can be emailed to your team
    if (useNetlify) {
      const body = new URLSearchParams(new FormData(form));
      body.set('subject', payload._subject || body.get('subject') || 'New website lead');
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      return { ok: res.ok };
    }

    if (!CFG.contactFormEndpoint) {
      if (!stored) await new Promise((r) => setTimeout(r, 500));
      return { ok: true, demo: true };
    }
    const res = await fetch(CFG.contactFormEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    return { ok: res.ok };
  }

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
    data._subject = `New website inquiry: ${data.full_name} (${data.business_name})`;
    setBusy(btn, true, 'Sending…');
    try {
      const r = await send(contactForm, data);
      if (!r.ok) throw new Error();
      track('generate_lead', { form: 'contact', service: data.service });
      contactForm.hidden = true;
      const ok = $('.form-success', contactForm.parentElement);
      ok.hidden = false; ok.focus();
    } catch (_) {
      showError(contactForm, `Sorry, something went wrong sending your message. Please try again or email us at ${CFG.email || 'our team'}.`);
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
    }
    dialog.showModal();
    track('booking_open', { service: service || 'general' });
  }

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

  /* Built-in slot picker (used until bookingUrl is configured) */
  const bk = Object.assign({ daysAhead: 10, times: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'], workDays: [1, 2, 3, 4, 5] }, CFG.booking || {});
  const dateStrip = $('#date-strip');
  const timeGrid = $('#time-grid');
  const summary = $('#picker-summary span');
  const state = { date: null, time: null };
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const fmtNum = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
  const fmtMon = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const to12 = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  function buildDates() {
    if (!dateStrip) return;
    dateStrip.innerHTML = '';
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    let n = 0;
    while (n < bk.daysAhead) {
      if (bk.workDays.includes(d.getDay())) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip';
        b.dataset.date = iso(d);
        b.dataset.label = fmtLong.format(d);
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', fmtLong.format(d));
        b.innerHTML = `<small>${fmtDay.format(d)}</small><strong>${fmtNum.format(d)}</strong><small>${fmtMon.format(d)}</small>`;
        dateStrip.append(b); n++;
      }
      d.setDate(d.getDate() + 1);
    }
  }
  function buildTimes() {
    if (!timeGrid) return;
    timeGrid.innerHTML = '';
    bk.times.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.time = t;
      b.textContent = to12(t);
      b.setAttribute('aria-pressed', 'false');
      // Simple deterministic "busy" slots so the preview feels realistic
      if (!state.date) b.disabled = true;
      else if ((parseInt(state.date.slice(-2), 10) + i) % 5 === 0) { b.disabled = true; b.setAttribute('aria-label', `${to12(t)} unavailable`); }
      timeGrid.append(b);
    });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('#picker-tz').textContent = state.date ? `Times shown in your time zone (${tz}).` : 'Pick a date to see available times.';
  }
  function updateSummary() {
    const dBtn = state.date && $(`[data-date="${state.date}"]`, dateStrip);
    summary.textContent = state.date && state.time
      ? `${dBtn.dataset.label} at ${to12(state.time)} · 30-minute video call`
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
      const r = await send(picker, data);
      if (!r.ok) throw new Error();
      track('generate_lead', { form: 'booking', service: data.service });
      $('#booking-success-text').textContent = `Your consultation request for ${data.requested_slot.split(' · ')[0]} has been received. We'll email ${data.email} to confirm shortly.`;
      picker.hidden = true; success.hidden = false; success.focus();
    } catch (_) {
      showError(picker, `Sorry, we couldn't complete your booking. Please try again or email ${CFG.email || 'our team'}.`);
    } finally { setBusy(btn, false); }
  });
  if (picker) { buildDates(); buildTimes(); updateSummary(); }
})();
