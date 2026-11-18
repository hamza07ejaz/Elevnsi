/* ELEVNSI — admin panel (open with #admin). Shows leads and edits contact details. */
(() => {
  const S = window.ElevStore;
  const CFG = window.ELEVNSI_CONFIG || {};
  const root = document.getElementById('admin-root');
  if (!S || !root) return;

  const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['won', 'Won'], ['lost', 'Lost']];
  const FIELDS = [
    { card: 'Messaging', icon: 'i-whatsapp', items: [
      { k: 'whatsapp', label: 'WhatsApp number', type: 'tel', ph: '+92 300 1234567', hint: 'International format with country code. Leave empty to hide the WhatsApp button.' },
      { k: 'whatsappMessage', label: 'WhatsApp greeting message', type: 'textarea', ph: "Hi ELEVNSI, I'd like to learn more about your AI automation solutions." },
      { k: 'phone', label: 'Phone number', type: 'tel', ph: '+92 300 1234567' }
    ] },
    { card: 'Email & location', icon: 'i-mail', items: [
      { k: 'email', label: 'Business email', type: 'email', ph: 'hello@elevnsi.com', required: true },
      { k: 'address', label: 'Office address', type: 'text', ph: 'City, Country' },
      { k: 'hours', label: 'Business hours', type: 'text', ph: 'Mon–Fri, 9:00 AM – 6:00 PM' }
    ] },
    { card: 'Social profiles', icon: 'i-share', items: [
      { k: 'linkedin', label: 'LinkedIn page', type: 'url', ph: 'https://www.linkedin.com/company/elevnsi' },
      { k: 'instagram', label: 'Instagram', type: 'url', ph: 'https://instagram.com/elevnsi' },
      { k: 'facebook', label: 'Facebook', type: 'url', ph: 'https://facebook.com/elevnsi' }
    ] }
  ];
  const DEFAULTS = { email: CFG.email || '', linkedin: CFG.linkedinUrl || '', whatsapp: CFG.whatsapp || '' };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const fmtDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const fmtFull = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });

  let access = null, built = false, leads = [], loaded = false, loadTimer = null;
  let unsubLeads = null, unsubContact = null, contactDirty = false;
  const ui = { tab: 'leads', q: '', status: 'all', source: 'all', open: null, confirm: null };

  /* ---------- Routing ---------- */
  async function route() {
    const on = location.hash === '#admin';
    document.body.classList.toggle('admin-mode', on);
    root.hidden = !on;
    if (!on) { stop(); return; }
    scrollTo(0, 0);
    if (!access) {
      root.innerHTML = '<div class="admin-denied"><p>Loading admin…</p></div>';
      access = await S.access();
    }
    const onWebHost = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (access.mode === 'local' && onWebHost && CFG.netlifyForms) { built = false; return renderNetlify(); }
    if (!access.canAdmin) { built = false; return renderDenied(); }
    if (!built) build();
    start();
  }
  addEventListener('hashchange', route);
  route();

  function stop() {
    unsubLeads?.(); unsubLeads = null;
    unsubContact?.(); unsubContact = null;
    clearTimeout(loadTimer);
  }

  function renderDenied() {
    root.innerHTML = `
      <div class="admin-denied">
        <span class="icon-tile">${icon('i-shield')}</span>
        <h1 class="h3">This area is for the ELEVNSI team</h1>
        <p>Only the site owner and editors can view leads and change contact details.</p>
        <a class="btn btn-dark" href="#top">Back to website</a>
      </div>`;
  }

  // On your own Netlify host, leads live in the Netlify dashboard
  function renderNetlify() {
    root.innerHTML = `
      <div class="admin-denied" style="max-width:620px;text-align:left">
        <span class="icon-tile" style="margin:0 0 18px">${icon('i-users')}</span>
        <h1 class="h3">Your leads are in Netlify</h1>
        <p style="margin-bottom:16px">Every contact form and consultation booking from this website is saved in your Netlify account.</p>
        <ol style="display:grid;gap:10px;padding-left:20px;color:var(--text-muted);margin:0 0 24px">
          <li><strong style="color:var(--text)">See leads:</strong> Netlify → your site → <strong style="color:var(--text)">Forms</strong> → <em>contact</em> or <em>consultation-booking</em>.</li>
          <li><strong style="color:var(--text)">Get an email for each lead:</strong> Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification.</li>
          <li><strong style="color:var(--text)">Change contact details</strong> (WhatsApp, phone, email, social links): edit <code>assets/js/config.js</code> and upload the site again.</li>
        </ol>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn btn-primary" href="https://app.netlify.com/" target="_blank" rel="noopener">Open Netlify ${icon('i-arrow')}</a>
          <a class="btn btn-outline" href="#top">Back to website</a>
        </div>
      </div>`;
  }

  /* ---------- Layout ---------- */
  function build() {
    built = true;
    const live = access.mode === 'live';
    root.innerHTML = `
      <header class="admin-top">
        <div class="container">
          <span class="brand">
            <svg class="brand-mark" aria-hidden="true"><use href="#mark"/></svg>
            <span class="brand-word">ELE<span class="v">V</span>NSI</span>
            <span class="admin-badge">Admin</span>
          </span>
          <div class="admin-tabs" role="tablist" aria-label="Admin sections">
            <button type="button" role="tab" id="tab-leads" aria-controls="panel-leads" aria-selected="true">${icon('i-users')}Leads <span class="count" id="lead-count">0</span></button>
            <button type="button" role="tab" id="tab-settings" aria-controls="panel-settings" aria-selected="false">${icon('i-gear')}Contact details</button>
          </div>
          <a class="btn btn-ghost btn-sm" href="#top">${icon('i-logout')}Back to site</a>
        </div>
      </header>
      <div class="container admin-body">
        <p class="admin-mode-note ${live ? 'live' : ''}">${icon(live ? 'i-shield' : 'i-alert')}<span>${live
          ? 'Leads from your website forms and bookings are saved here automatically. Only you and editors of this page can see them.'
          : 'Preview mode: leads and contact details are saved in this browser only. When the site runs on your own host, connect a database or form service so leads from every visitor reach you.'}</span></p>

        <section id="panel-leads" role="tabpanel" aria-labelledby="tab-leads">
          <h1 class="admin-h">Leads</h1>
          <p class="admin-sub">Everyone who sent an inquiry or booked a consultation.</p>
          <div class="stats" id="lead-stats"></div>
          <div class="toolbar">
            <label class="search"><span class="visually-hidden">Search leads</span>${icon('i-search')}<input class="input" id="lead-search" type="search" placeholder="Search name, business, email…"></label>
            <label><span class="visually-hidden">Filter by status</span>
              <select class="input" id="lead-status"><option value="all">All statuses</option>${STATUSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
            <label><span class="visually-hidden">Filter by source</span>
              <select class="input" id="lead-source"><option value="all">All sources</option><option value="contact">Contact form</option><option value="booking">Consultation booking</option></select></label>
            <button type="button" class="btn btn-dark btn-sm" id="lead-export">${icon('i-download')}Export CSV</button>
          </div>
          <div class="leads-table" id="lead-table" aria-live="polite"></div>
          <p class="save-state" id="export-state" role="status"></p>
        </section>

        <section id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" hidden>
          <h1 class="admin-h">Contact details</h1>
          <p class="admin-sub">These appear on your website: contact section, footer and the WhatsApp button.</p>
          <form id="contact-settings" novalidate>
            <div class="settings-grid">
              ${FIELDS.map((card) => `
                <fieldset class="settings-card" style="border:1px solid var(--line);margin:0">
                  <h3>${icon(card.icon)}${card.card}</h3>
                  ${card.items.map((f) => `
                    <div class="field">
                      <label for="set-${f.k}">${f.label}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
                      ${f.hint ? `<span class="hint" id="set-${f.k}-hint">${f.hint}</span>` : ''}
                      ${f.type === 'textarea'
                        ? `<textarea class="input" id="set-${f.k}" name="${f.k}" rows="3" placeholder="${esc(f.ph)}"></textarea>`
                        : `<input class="input" id="set-${f.k}" name="${f.k}" type="${f.type}" placeholder="${esc(f.ph)}" ${f.required ? 'required' : ''} ${f.type === 'tel' ? 'pattern="[0-9+\\(\\)\\-\\s.]{7,}"' : ''} ${f.hint ? `aria-describedby="set-${f.k}-hint"` : ''} data-error="set-${f.k}-err">`}
                      <p class="error-msg" id="set-${f.k}-err">${icon('i-alert')}${f.type === 'email' ? 'Enter an email address in the format you@company.com.' : f.type === 'url' ? 'Enter a full link starting with https://' : f.type === 'tel' ? 'Enter a valid number with country code, e.g. +92 300 1234567.' : 'Please check this field.'}</p>
                    </div>`).join('')}
                </fieldset>`).join('')}
            </div>
            <div class="settings-foot">
              <span class="save-state" id="settings-state" role="status"></span>
              <button type="submit" class="btn btn-primary">Save changes</button>
            </div>
          </form>
        </section>
      </div>`;

    // Tabs
    const tabs = [['leads', root.querySelector('#tab-leads')], ['settings', root.querySelector('#tab-settings')]];
    tabs.forEach(([name, btn]) => btn.addEventListener('click', () => setTab(name)));
    root.querySelector('.admin-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      setTab(ui.tab === 'leads' ? 'settings' : 'leads');
      root.querySelector(`#tab-${ui.tab}`).focus();
    });

    // Filters
    root.querySelector('#lead-search').addEventListener('input', (e) => { ui.q = e.target.value.trim().toLowerCase(); renderLeads(); });
    root.querySelector('#lead-status').addEventListener('change', (e) => { ui.status = e.target.value; renderLeads(); });
    root.querySelector('#lead-source').addEventListener('change', (e) => { ui.source = e.target.value; renderLeads(); });
    root.querySelector('#lead-export').addEventListener('click', exportCsv);

    // Table interactions (event delegation)
    const table = root.querySelector('#lead-table');
    table.addEventListener('click', onTableClick);
    table.addEventListener('change', onTableChange);

    // Settings
    const form = root.querySelector('#contact-settings');
    form.addEventListener('input', () => { contactDirty = true; setSaveState(''); });
    form.addEventListener('submit', saveSettings);
  }

  function setTab(name) {
    ui.tab = name;
    root.querySelector('#tab-leads').setAttribute('aria-selected', String(name === 'leads'));
    root.querySelector('#tab-settings').setAttribute('aria-selected', String(name === 'settings'));
    root.querySelector('#panel-leads').hidden = name !== 'leads';
    root.querySelector('#panel-settings').hidden = name !== 'settings';
  }

  /* ---------- Data ---------- */
  function start() {
    if (!unsubLeads) {
      loaded = false;
      renderLeads();
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => { if (!loaded) renderLeads('The leads database can’t be reached right now. Check your connection; this page will update by itself.'); }, 10000);
      unsubLeads = S.watchLeads((list, meta) => {
        leads = list;
        if (!meta.fromCache) { loaded = true; clearTimeout(loadTimer); }
        else if (!loaded && list.length) loaded = true;
        renderLeads();
      }, (err) => { loaded = true; clearTimeout(loadTimer); renderLeads(err.code === 'revoked' ? 'Your access to these leads has changed.' : 'Leads could not be loaded.'); });
    }
    if (!unsubContact) {
      unsubContact = S.watchContact((saved) => {
        if (contactDirty) return; // don't overwrite while editing
        const data = { ...DEFAULTS, ...saved };
        FIELDS.forEach((c) => c.items.forEach((f) => { const el = root.querySelector('#set-' + f.k); if (el) el.value = data[f.k] || ''; }));
      });
    }
  }

  const filtered = () => leads.filter((l) =>
    (ui.status === 'all' || (l.status || 'new') === ui.status) &&
    (ui.source === 'all' || l.source === ui.source) &&
    (!ui.q || [l.full_name, l.business_name, l.email, l.phone, l.service, l.message].join(' ').toLowerCase().includes(ui.q)));

  /* ---------- Leads rendering ---------- */
  function renderLeads(notice) {
    if (!built) return;
    const week = Date.now() - 7 * 864e5;
    const stats = [
      ['Total leads', leads.length, false],
      ['New', leads.filter((l) => (l.status || 'new') === 'new').length, true],
      ['Last 7 days', leads.filter((l) => Date.parse(l.createdAt) >= week).length, false],
      ['Consultations booked', leads.filter((l) => l.source === 'booking').length, false]
    ];
    root.querySelector('#lead-stats').innerHTML = stats.map(([l, n, hl]) => `<div class="stat ${hl ? 'hl' : ''}"><span>${l}</span><strong>${loaded ? n : '–'}</strong></div>`).join('');
    root.querySelector('#lead-count').textContent = leads.length;

    const table = root.querySelector('#lead-table');
    const focusKey = document.activeElement?.closest?.('#lead-table') ? document.activeElement.dataset.focus : null;

    if (notice && !leads.length) { table.innerHTML = `<div class="empty"><strong>Leads unavailable</strong>${esc(notice)}</div>`; return; }
    if (!loaded) { table.innerHTML = '<div class="empty">Loading leads…</div>'; return; }
    if (!leads.length) {
      table.innerHTML = `<div class="empty"><span class="icon-tile">${icon('i-users')}</span><strong>No leads yet</strong>When someone sends the contact form or books a consultation, they'll appear here.</div>`;
      return;
    }
    const rows = filtered();
    if (!rows.length) { table.innerHTML = '<div class="empty"><strong>No matching leads</strong>Try a different search or filter.</div>'; return; }

    table.innerHTML = `
      <div class="lead-row head" aria-hidden="true"><span>Lead</span><span>Contact</span><span>Service</span><span>Received</span><span>Status</span><span></span></div>
      ${rows.map(rowHtml).join('')}`;
    if (focusKey) table.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus();
  }

  function rowHtml(l) {
    const key = l._doc + ':' + l.id;
    const d = new Date(l.createdAt);
    const open = ui.open === key;
    const st = l.status || 'new';
    const phoneDigits = String(l.phone || '').replace(/[^\d]/g, '');
    return `
      <div class="lead-row" data-key="${esc(key)}">
        <button type="button" class="lead-toggle c-name" data-act="toggle" data-focus="t-${esc(key)}" aria-expanded="${open}">
          <strong>${esc(l.full_name || 'Unnamed')}</strong><small>${esc(l.business_name || '—')}</small>
        </button>
        <div class="c-contact"><strong>${esc(l.email || '—')}</strong><small>${esc(l.phone || 'No phone')}</small></div>
        <div class="c-service"><small>${esc(l.service || '—')}</small>
          <span class="src ${l.source === 'booking' ? 'booking' : ''}">${icon(l.source === 'booking' ? 'i-calendar' : 'i-mail')}${l.source === 'booking' ? 'Booking' : 'Contact form'}</span></div>
        <div class="c-date"><strong>${isNaN(d) ? '—' : fmtDate.format(d)}</strong><small>${isNaN(d) ? '' : fmtTime.format(d)}</small></div>
        <label class="c-status"><span class="visually-hidden">Status for ${esc(l.full_name)}</span>
          <select class="input status-select" data-act="status" data-focus="s-${esc(key)}" data-status="${st}">
            ${STATUSES.map(([v, t]) => `<option value="${v}" ${v === st ? 'selected' : ''}>${t}</option>`).join('')}
          </select></label>
        <button type="button" class="icon-btn c-del" data-act="ask-delete" data-focus="d-${esc(key)}" aria-label="Delete lead from ${esc(l.full_name)}">${icon('i-trash')}</button>
        ${ui.confirm === key ? `
          <div class="confirm-del" role="alert">
            <span>Delete this lead permanently? This can't be undone.</span>
            <button type="button" class="btn btn-danger" data-act="delete" data-focus="cd-${esc(key)}">Delete</button>
            <button type="button" class="btn btn-outline" data-act="cancel-delete" data-focus="cc-${esc(key)}">Cancel</button>
          </div>` : ''}
        ${open ? `
          <dl class="lead-detail">
            <div><dt>Email</dt><dd class="copyable">${esc(l.email || '—')}</dd></div>
            <div><dt>Phone</dt><dd class="copyable">${esc(l.phone || '—')}</dd></div>
            <div><dt>Business</dt><dd>${esc(l.business_name || '—')}</dd></div>
            <div><dt>Service</dt><dd>${esc(l.service || '—')}</dd></div>
            ${l.requested_slot ? `<div><dt>Requested consultation</dt><dd>${esc(l.requested_slot)}</dd></div><div><dt>Their time zone</dt><dd>${esc(l.timezone || '—')}</dd></div>` : ''}
            <div class="full"><dt>Received</dt><dd>${isNaN(d) ? '—' : fmtFull.format(d)}</dd></div>
            ${l.message ? `<div class="full"><dt>Message</dt><dd class="msg">${esc(l.message)}</dd></div>` : ''}
            <div class="lead-actions">
              ${l.email ? `<a class="btn btn-dark btn-sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Your inquiry with ELEVNSI')}">${icon('i-mail')}Email</a>` : ''}
              ${phoneDigits ? `<a class="btn btn-outline btn-sm" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener">${icon('i-whatsapp')}WhatsApp</a>` : ''}
              ${l.email ? `<button type="button" class="btn btn-outline btn-sm" data-act="copy" data-value="${esc(l.email)}">Copy email</button>` : ''}
            </div>
          </dl>` : ''}
      </div>`;
  }

  const leadFor = (el) => {
    const key = el.closest('.lead-row')?.dataset.key;
    return leads.find((l) => l._doc + ':' + l.id === key);
  };

  async function onTableClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.tagName === 'SELECT') return;
    const lead = leadFor(btn);
    if (!lead) return;
    const key = lead._doc + ':' + lead.id;
    const act = btn.dataset.act;
    if (act === 'toggle') { ui.open = ui.open === key ? null : key; renderLeads(); }
    else if (act === 'ask-delete') { ui.confirm = key; renderLeads(); root.querySelector(`[data-focus="cc-${CSS.escape(key)}"]`)?.focus(); }
    else if (act === 'cancel-delete') { ui.confirm = null; renderLeads(); root.querySelector(`[data-focus="d-${CSS.escape(key)}"]`)?.focus(); }
    else if (act === 'delete') {
      btn.setAttribute('aria-busy', 'true');
      try { await S.deleteLead(lead); ui.confirm = null; if (ui.open === key) ui.open = null; if (access.mode === 'local') renderLeads(); }
      catch (_) { btn.removeAttribute('aria-busy'); btn.textContent = 'Couldn’t delete. Try again'; }
    } else if (act === 'copy') {
      try { await navigator.clipboard.writeText(btn.dataset.value); btn.textContent = 'Copied'; }
      catch (_) { const dd = btn.closest('.lead-detail').querySelector('.copyable'); getSelection().selectAllChildren(dd); btn.textContent = 'Selected, press Ctrl+C'; }
    }
  }

  async function onTableChange(e) {
    const sel = e.target.closest('[data-act="status"]');
    if (!sel) return;
    const lead = leadFor(sel);
    if (!lead) return;
    sel.dataset.status = sel.value;
    try { await S.updateLead(lead, { status: sel.value }); }
    catch (_) { sel.value = lead.status || 'new'; sel.dataset.status = sel.value; }
  }

  /* ---------- CSV export ---------- */
  async function exportCsv() {
    const out = root.querySelector('#export-state');
    const rows = filtered();
    if (!rows.length) { out.textContent = 'There are no leads to export with the current filters.'; out.className = 'save-state err'; return; }
    const cols = [['createdAt', 'Received'], ['status', 'Status'], ['source', 'Source'], ['full_name', 'Full name'], ['business_name', 'Business'], ['email', 'Email'], ['phone', 'Phone'], ['service', 'Service'], ['requested_slot', 'Requested consultation'], ['timezone', 'Time zone'], ['message', 'Message']];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => cell(c[1])).join(','), ...rows.map((l) => cols.map(([k]) => cell(l[k])).join(','))].join('\r\n');
    try {
      await S.saveFile(`elevnsi-leads-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + csv);
      out.textContent = `Exported ${rows.length} lead${rows.length === 1 ? '' : 's'}.`; out.className = 'save-state ok';
    } catch (err) {
      out.textContent = err && err.code === 'declined' ? 'Export cancelled.' : 'The file couldn’t be saved. Please try again.'; out.className = 'save-state err';
    }
  }

  /* ---------- Contact settings ---------- */
  function setSaveState(msg, kind = '') {
    const el = root.querySelector('#settings-state');
    if (el) { el.textContent = msg; el.className = 'save-state ' + kind; }
  }
  async function saveSettings(e) {
    e.preventDefault();
    const form = e.currentTarget;
    form.classList.add('was-submitted');
    const fields = [...form.querySelectorAll('.input')];
    fields.forEach((f) => f.setAttribute('aria-invalid', String(!f.validity.valid)));
    const bad = fields.find((f) => !f.validity.valid);
    if (bad) { bad.focus(); setSaveState('Please fix the highlighted fields.', 'err'); return; }
    const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    const btn = form.querySelector('button[type="submit"]');
    btn.setAttribute('aria-busy', 'true');
    setSaveState('Saving…');
    try {
      await S.saveContact(data);
      contactDirty = false;
      setSaveState('Saved. Your website now shows these details.', 'ok');
    } catch (err) {
      setSaveState(err && err.code === 'invalid_argument' ? 'You don’t have permission to change these details.' : 'Couldn’t save. Please try again.', 'err');
    } finally { btn.removeAttribute('aria-busy'); }
  }
})();
