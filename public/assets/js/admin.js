/* ELEVNSI — admin panel (open with #admin). Shows leads and edits contact details. */
(() => {
  const S = window.ElevStore;
  const CFG = window.ELEVNSI_CONFIG || {};
  const root = document.getElementById('admin-root');
  if (!S || !root) return;

  const TABS = ['leads', 'calls', 'settings', 'demo'];
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
  const cl = { data: null, error: '', open: null, confirm: null, filter: 'all', timer: null, settingsDirty: false };

  /* ---------- Routing ---------- */
  async function route() {
    const on = location.hash === '#admin';
    document.body.classList.toggle('admin-mode', on);
    root.hidden = !on;
    if (!on) { stop(); return; }
    scrollTo(0, 0);
    if (!built) root.innerHTML = '<div class="admin-denied"><p>Loading admin…</p></div>';
    access = await S.access();
    if (access.mode === 'api' && access.needsLogin) { built = false; return renderLogin(); }
    if (!access.canAdmin) { built = false; return renderDenied(); }
    if (!built) build();
    start();
  }
  addEventListener('hashchange', route);
  route();

  function stop() {
    clearInterval(cl.timer);
    unsubLeads?.(); unsubLeads = null;
    unsubContact?.(); unsubContact = null;
    clearTimeout(loadTimer);
  }

  /* ---------- Sign in (site backend) ---------- */
  function renderLogin(notice = '') {
    stop();
    root.innerHTML = `
      <div class="admin-login">
        <form class="login-card" id="admin-login" novalidate>
          <span class="brand on-light">
            <svg class="brand-mark" aria-hidden="true"><use href="#mark"/></svg>
            <span class="brand-word">ELE<span class="v">V</span>NSI</span>
            <span class="admin-badge">Admin</span>
          </span>
          <h1 class="h3">Sign in to the admin panel</h1>
          <p class="admin-sub">See your leads and bookings, and update the contact details on your website.</p>
          ${notice ? `<p class="admin-mode-note" role="status">${icon('i-alert')}<span>${esc(notice)}</span></p>` : ''}
          <input class="visually-hidden" type="text" name="username" autocomplete="username" value="admin" tabindex="-1" aria-hidden="true" readonly>
          <div class="field">
            <label for="admin-password">Admin password</label>
            <div class="pw-wrap">
              <input class="input" id="admin-password" name="password" type="password" autocomplete="current-password" required enterkeyhint="done" data-error="admin-password-err">
              <button type="button" class="pw-toggle" aria-pressed="false" aria-controls="admin-password">Show</button>
            </div>
            <p class="error-msg" id="admin-password-err">${icon('i-alert')}<span id="admin-password-err-text">Please enter your admin password.</span></p>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
          <p class="login-hint">Forgot the password? Change <code>ADMIN_PASSWORD</code> in Vercel → your project → Settings → Environment Variables, then redeploy.</p>
          <a class="link-arrow" href="#top">Back to website</a>
        </form>
      </div>`;
    const form = root.querySelector('#admin-login');
    const pw = form.querySelector('#admin-password');
    const toggle = form.querySelector('.pw-toggle');
    toggle.addEventListener('click', () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', String(show));
    });
    const errText = form.querySelector('#admin-password-err-text');
    const setErr = (msg) => {
      errText.textContent = msg;
      pw.setCustomValidity(msg ? msg : '');
      form.classList.toggle('was-submitted', !!msg);
      pw.setAttribute('aria-invalid', String(!!msg));
      pw.setAttribute('aria-describedby', msg ? 'admin-password-err' : '');
    };
    pw.addEventListener('input', () => setErr(''));
    pw.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pw.value) { setErr('Please enter your admin password.'); pw.focus(); return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Signing in…';
      try {
        await S.login(pw.value);
        built = false;
        route();
      } catch (err) {
        btn.removeAttribute('aria-busy'); btn.textContent = 'Sign in';
        setErr(err.code === 'wrong_password' ? 'That password isn’t right. Try again.'
          : err.code === 'not_configured' ? 'The admin password hasn’t been set yet. Add ADMIN_PASSWORD in Vercel → your project → Settings → Environment Variables, then redeploy.'
          : err.message || 'Couldn’t sign in. Please try again.');
        pw.focus(); pw.select();
      }
    });
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

  /* ---------- Layout ---------- */
  function build() {
    built = true;
    const live = access.mode === 'live' || access.mode === 'api';
    const liveNote = access.mode === 'api'
      ? 'Leads and bookings are saved securely on your website. You get an email for every new lead, and customers get an automatic confirmation.'
      : 'Leads from your website forms and bookings are saved here automatically. Only you and editors of this page can see them.';
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
            <button type="button" role="tab" id="tab-calls" aria-controls="panel-calls" aria-selected="false">${icon('i-phone')}AI Calls</button>
            <button type="button" role="tab" id="tab-settings" aria-controls="panel-settings" aria-selected="false">${icon('i-gear')}Contact details</button>
            <button type="button" role="tab" id="tab-demo" aria-controls="panel-demo" aria-selected="false">${icon('i-shield')}Demo access</button>
          </div>
          <div class="admin-actions">
            <a class="btn btn-ghost btn-sm" href="#top">Back to site</a>
            ${access.mode === 'api' ? `<button type="button" class="btn btn-ghost btn-sm" id="admin-logout">${icon('i-logout')}Sign out</button>` : ''}
          </div>
        </div>
      </header>
      <div class="container admin-body">
        <p class="admin-mode-note ${live ? 'live' : ''}">${icon(live ? 'i-shield' : 'i-alert')}<span>${live
          ? liveNote
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
              <select class="input" id="lead-source"><option value="all">All sources</option><option value="contact">Contact form</option><option value="booking">Consultation booking</option><option value="call">AI phone call</option></select></label>
            ${access.mode === 'api' ? `<button type="button" class="btn btn-outline btn-sm" id="lead-refresh">${icon('i-refresh')}Refresh</button>` : ''}
            <button type="button" class="btn btn-dark btn-sm" id="lead-export">${icon('i-download')}Export CSV</button>
          </div>
          <div class="leads-table" id="lead-table" aria-live="polite"></div>
          <p class="save-state" id="export-state" role="status"></p>
        </section>

        <section id="panel-calls" role="tabpanel" aria-labelledby="tab-calls" hidden>
          <h1 class="admin-h">AI Calls</h1>
          <p class="admin-sub">Your AI phone agent answers calls 24/7, books consultations, qualifies leads and can call people back. Every call is saved here with its recording, transcript and summary.</p>
          ${access.mode === 'api' ? `
          <div id="calls-setup"></div>
          <div class="stats" id="calls-stats"></div>
          <div class="calls-layout">
            <div>
              <div class="toolbar">
                <label><span class="visually-hidden">Filter calls</span>
                  <select class="input" id="calls-filter">
                    <option value="all">All calls</option><option value="inbound">Incoming</option><option value="outbound">Outgoing</option>
                    <option value="booked">Booked</option><option value="transferred">Transferred</option><option value="missed">No answer / voicemail</option>
                  </select></label>
                <button type="button" class="btn btn-outline btn-sm" id="calls-refresh">${icon('i-refresh')}Refresh</button>
                <span class="save-state" id="calls-state" role="status"></span>
              </div>
              <div class="leads-table" id="calls-table" aria-live="polite"></div>
            </div>
            <form class="settings-card" id="call-now" novalidate>
              <h3>${icon('i-phone')}Call someone now</h3>
              <p class="hint">The AI calls this number straight away and talks to them as your assistant.</p>
              <div class="field">
                <label for="cn-name">Name</label>
                <input class="input" id="cn-name" maxlength="120" placeholder="e.g. Ali Khan" autocomplete="off">
              </div>
              <div class="field">
                <label for="cn-number">Phone number <span class="req" aria-hidden="true">*</span></label>
                <input class="input" id="cn-number" type="tel" required placeholder="+1 416 555 0100" autocomplete="off" data-error="cn-number-err">
                <p class="error-msg" id="cn-number-err">${icon('i-alert')}Enter the number with its country code.</p>
              </div>
              <div class="field">
                <label for="cn-reason">Reason for the call</label>
                <input class="input" id="cn-reason" maxlength="200" placeholder="e.g. your inquiry about AI appointment booking">
                <span class="hint">The AI says this in its greeting.</span>
              </div>
              <label class="consent-check"><input type="checkbox" id="cn-consent"><span>This person agreed to receive a call from our AI assistant.</span></label>
              <div class="call-now-actions">
                <button type="submit" class="btn btn-primary">${icon('i-phone')}Call now</button>
                <button type="button" class="btn btn-outline btn-sm" id="cn-test">Test call to my phone</button>
              </div>
              <p class="save-state" id="cn-state" role="status"></p>
            </form>
          </div>

          <form id="agent-settings" novalidate>
            <h2 class="admin-h2">Agent settings</h2>
            <div class="settings-grid">
              <fieldset class="settings-card" style="border:1px solid var(--line);margin:0">
                <h3>${icon('i-headset')}Voice &amp; greeting</h3>
                <div class="two-col">
                  <div class="field"><label for="ag-agentName">Agent name</label><input class="input" id="ag-agentName" maxlength="40"></div>
                  <div class="field"><label for="ag-voiceId">Voice</label><select class="input" id="ag-voiceId"></select></div>
                </div>
                <div class="field"><label for="ag-greeting">Greeting for incoming calls</label><textarea class="input" id="ag-greeting" rows="3" maxlength="400"></textarea></div>
                <div class="field"><label for="ag-outboundGreeting">Greeting for outgoing calls</label>
                  <span class="hint" id="ag-og-hint">Use {{agent}} for the agent name, {{name}} for their first name and {{reason}} for the reason.</span>
                  <textarea class="input" id="ag-outboundGreeting" rows="3" maxlength="400" aria-describedby="ag-og-hint"></textarea></div>
              </fieldset>
              <fieldset class="settings-card" style="border:1px solid var(--line);margin:0">
                <h3>${icon('i-layers')}What the AI knows</h3>
                <div class="field"><label for="ag-knowledge">Business information</label>
                  <span class="hint" id="ag-kn-hint">Services, hours, policies, common questions. The AI only answers from this.</span>
                  <textarea class="input" id="ag-knowledge" rows="9" maxlength="8000" aria-describedby="ag-kn-hint"></textarea></div>
                <div class="field"><label for="ag-questions">Qualifying questions</label>
                  <span class="hint" id="ag-q-hint">One per line. The AI asks them naturally, one at a time.</span>
                  <textarea class="input" id="ag-questions" rows="4" maxlength="1500" aria-describedby="ag-q-hint"></textarea></div>
              </fieldset>
              <fieldset class="settings-card" style="border:1px solid var(--line);margin:0">
                <h3>${icon('i-clock')}Calls &amp; transfers</h3>
                <div class="field"><label for="ag-transferNumber">Transfer calls to</label>
                  <span class="hint" id="ag-tr-hint">Your phone, with country code. Leave empty to take a message instead.</span>
                  <input class="input" id="ag-transferNumber" type="tel" placeholder="+1 416 555 0100" aria-describedby="ag-tr-hint"></div>
                <div class="two-col">
                  <div class="field"><label for="ag-callStart">Outgoing calls from</label><input class="input" id="ag-callStart" type="time"></div>
                  <div class="field"><label for="ag-callEnd">until</label><input class="input" id="ag-callEnd" type="time"></div>
                </div>
                <fieldset class="days" style="border:0;padding:0;margin:0"><legend class="hint">Outgoing call days (your business time zone)</legend>
                  ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => `<label><input type="checkbox" name="callDays" value="${i}">${d}</label>`).join('')}
                </fieldset>
                <div class="field"><label for="ag-maxMinutes">Longest call (minutes)</label><input class="input" id="ag-maxMinutes" type="number" min="2" max="30"></div>
              </fieldset>
              <fieldset class="settings-card" style="border:1px solid var(--line);margin:0">
                <h3>${icon('i-gear')}Automation</h3>
                <label class="toggle-row"><input type="checkbox" id="ag-autoCallLeads"><span><strong>Call new website leads back</strong>The AI calls people who tick “Call me back now” on the contact form, within calling hours.</span></label>
                <label class="toggle-row"><input type="checkbox" id="ag-recordCalls"><span><strong>Record calls</strong>Keep the greeting's “this call may be recorded” line when this is on.</span></label>
                <label class="toggle-row"><input type="checkbox" id="ag-emailSummaries"><span><strong>Email me a summary after each call</strong>Sent to your admin email.</span></label>
              </fieldset>
            </div>
            <div class="settings-foot">
              <span class="save-state" id="agent-state" role="status"></span>
              <button type="submit" class="btn btn-primary">Save agent settings</button>
            </div>
          </form>` : `
          <p class="admin-mode-note">${icon('i-alert')}<span>AI calling works on your live website (Vercel). Open the admin panel there to set it up.</span></p>`}
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

        <section id="panel-demo" role="tabpanel" aria-labelledby="tab-demo" hidden>
          <h1 class="admin-h">Demo access</h1>
          <p class="admin-sub">The console demo is private. Create a personal link for each person you want to show it to, and switch it off whenever you like.</p>
          ${access.mode === 'api' ? `
          <div class="inv-layout">
            <form class="settings-card inv-form" id="inv-form" novalidate>
              <h3>${icon('i-users')}New invite link</h3>
              <div class="field">
                <label for="inv-name">Who is it for? <span class="req" aria-hidden="true">*</span></label>
                <input class="input" id="inv-name" name="name" maxlength="80" required placeholder="e.g. Ali Khan" autocomplete="off" data-error="inv-name-err">
                <p class="error-msg" id="inv-name-err">${icon('i-alert')}Please enter who this link is for.</p>
              </div>
              <div class="field">
                <label for="inv-note">Company or note <span class="opt">(optional)</span></label>
                <input class="input" id="inv-note" name="note" maxlength="120" placeholder="e.g. Smile Dental, Toronto" autocomplete="off">
              </div>
              <div class="field">
                <label for="inv-days">Link works for</label>
                <select class="input" id="inv-days" name="days">
                  <option value="1">1 day</option><option value="3">3 days</option><option value="7" selected>7 days</option>
                  <option value="14">14 days</option><option value="30">30 days</option><option value="0">No expiry</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary">Create link</button>
              <div class="inv-new" id="inv-new" hidden></div>
            </form>
            <div>
              <div class="stats inv-stats" id="inv-stats"></div>
              <div class="toolbar">
                <button type="button" class="btn btn-outline btn-sm" id="inv-refresh">${icon('i-refresh')}Refresh</button>
                <span class="save-state" id="inv-state" role="status"></span>
              </div>
              <div class="leads-table" id="inv-table" aria-live="polite"></div>
            </div>
          </div>` : `
          <p class="admin-mode-note">${icon('i-alert')}<span>Demo invite links work on your live website (Vercel), where the private demo is protected by the server. Open the admin panel on your live site to create them.</span></p>`}
        </section>
      </div>`;

    // Tabs
    TABS.forEach((name) => root.querySelector(`#tab-${name}`).addEventListener('click', () => setTab(name)));
    root.querySelector('.admin-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = TABS.indexOf(ui.tab) + (e.key === 'ArrowRight' ? 1 : -1);
      setTab(TABS[(i + TABS.length) % TABS.length]);
      root.querySelector(`#tab-${ui.tab}`).focus();
    });
    setTab(ui.tab);
    if (access.mode === 'api') { bindInvites(); bindCalls(); }

    // Filters
    root.querySelector('#lead-search').addEventListener('input', (e) => { ui.q = e.target.value.trim().toLowerCase(); renderLeads(); });
    root.querySelector('#lead-status').addEventListener('change', (e) => { ui.status = e.target.value; renderLeads(); });
    root.querySelector('#lead-source').addEventListener('change', (e) => { ui.source = e.target.value; renderLeads(); });
    root.querySelector('#lead-export').addEventListener('click', exportCsv);
    root.querySelector('#lead-refresh')?.addEventListener('click', () => S.refreshLeads());
    root.querySelector('#admin-logout')?.addEventListener('click', () => { S.logout(); built = false; renderLogin('You’ve signed out.'); });

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
    TABS.forEach((t) => {
      root.querySelector(`#tab-${t}`).setAttribute('aria-selected', String(t === name));
      root.querySelector(`#panel-${t}`).hidden = t !== name;
    });
    if (name === 'demo' && access.mode === 'api' && !inv.loaded) loadInvites();
    clearInterval(cl.timer);
    if (name === 'calls' && access.mode === 'api') {
      loadCalls();
      cl.timer = setInterval(() => { if (!document.hidden) loadCalls(true); }, 15000);
    }
  }

  /* ---------- AI calls ---------- */
  const OUTCOME = {
    booked: ['Booked', 'ok'], transferred: ['Transferred', 'info'], completed: ['Completed', ''], voicemail: ['Voicemail', 'muted'],
    'no-answer': ['No answer', 'muted'], failed: ['Failed', 'bad']
  };
  const LIVE = { queued: 'Starting…', ringing: 'Ringing…', 'in-progress': 'On the call now', forwarding: 'Transferring…' };
  const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '–');
  const callAuthErr = (err) => { if (err && err.code === 'unauthorized') { built = false; renderLogin('Your session ended. Please sign in again.'); return true; } return false; };

  function bindCalls() {
    root.querySelector('#calls-refresh').addEventListener('click', () => loadCalls());
    root.querySelector('#calls-filter').addEventListener('change', (e) => { cl.filter = e.target.value; renderCalls(); });
    root.querySelector('#calls-table').addEventListener('click', onCallClick);
    root.querySelector('#calls-setup').addEventListener('click', onSetupClick);
    const form = root.querySelector('#call-now');
    form.addEventListener('submit', (e) => { e.preventDefault(); placeCall(false); });
    root.querySelector('#cn-test').addEventListener('click', () => placeCall(true));
    const agent = root.querySelector('#agent-settings');
    agent.addEventListener('input', () => { cl.settingsDirty = true; });
    agent.addEventListener('submit', saveAgent);
  }

  async function loadCalls(quiet = false) {
    const state = root.querySelector('#calls-state');
    if (!quiet && state) { state.textContent = 'Loading…'; state.className = 'save-state'; }
    try { cl.data = await S.calls.overview(); cl.error = ''; }
    catch (err) { if (callAuthErr(err)) return; cl.error = err.message || 'Calls could not be loaded.'; }
    if (state && !quiet) state.textContent = '';
    renderCalls();
    if (cl.data && !cl.settingsDirty) fillAgent(cl.data.settings, cl.data.voices);
  }

  function renderSetup() {
    const box = root.querySelector('#calls-setup');
    const d = cl.data;
    if (!d) { box.innerHTML = ''; return; }
    const s = d.setup;
    const ready = s.vapiKey && s.webhookSecret && s.connected && s.siteUrl;
    const item = (ok, label, help) => `<li class="${ok ? 'done' : ''}">${icon(ok ? 'i-check' : 'i-alert')}<span><strong>${label}</strong>${ok ? '' : `<small>${help}</small>`}</span></li>`;
    box.innerHTML = `
      <div class="calls-setup ${ready ? 'ready' : ''}">
        <div class="cs-head">
          <div><strong>${ready ? `Your AI phone line is live${d.connection.number ? `: ${esc(d.connection.number)}` : ''}` : 'Finish setting up your AI phone line'}</strong>
          <small>${ready ? 'Incoming calls to this number are answered by the AI. See the setup guide in the README to change anything.' : 'Follow the steps in the setup guide (README), then press Connect.'}</small></div>
          ${s.vapiKey && s.webhookSecret ? `<button type="button" class="btn ${s.connected ? 'btn-outline' : 'btn-primary'} btn-sm" data-setup="connect">${s.connected ? 'Reconnect number' : 'Connect phone number'}</button>` : ''}
        </div>
        ${ready ? '' : `<ul class="cs-steps">
          ${item(s.vapiKey, 'Vapi API key added', 'Add VAPI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')}
          ${item(s.webhookSecret, 'Webhook secret added', 'Add VAPI_WEBHOOK_SECRET (any long random text) in Vercel, then redeploy.')}
          ${item(s.siteUrl, 'Site address set', `Add SITE_URL with your exact live address, e.g. https://www.elevnsi.com, then redeploy and press Reconnect. Calls are currently sent to ${esc(s.webhookUrl)}.`)}
          ${item(s.twilio || s.connected, 'Twilio number added', 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in Vercel, then redeploy.')}
          ${item(s.connected, 'Phone number connected', 'Press “Connect phone number” above.')}
        </ul>`}
        <p class="save-state" id="setup-state" role="status"></p>
      </div>`;
  }

  async function onSetupClick(e) {
    const btn = e.target.closest('[data-setup="connect"]');
    if (!btn) return;
    const out = root.querySelector('#setup-state');
    btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Connecting…';
    try {
      await S.calls.connect();
      await loadCalls(true);
      const o = root.querySelector('#setup-state'); if (o) { o.textContent = 'Connected. Call your number to talk to your AI.'; o.className = 'save-state ok'; }
    } catch (err) {
      if (callAuthErr(err)) return;
      btn.removeAttribute('aria-busy'); btn.textContent = 'Try again';
      out.textContent = err.message || 'Couldn’t connect. Please try again.'; out.className = 'save-state err';
    }
  }

  function filteredCalls() {
    const f = cl.filter;
    return (cl.data?.calls || []).filter((c) => f === 'all' || (f === 'inbound' || f === 'outbound' ? c.direction === f
      : f === 'missed' ? ['no-answer', 'voicemail'].includes(c.outcome) : c.outcome === f));
  }

  function renderCalls() {
    if (!built || access.mode !== 'api') return;
    renderSetup();
    const calls = cl.data?.calls || [];
    const month = Date.now() - 30 * 864e5;
    const recent = calls.filter((c) => Date.parse(c.createdAt) >= month);
    const mins = Math.round(recent.reduce((n, c) => n + (c.durationSeconds || 0), 0) / 60);
    const cost = recent.reduce((n, c) => n + (typeof c.cost === 'number' ? c.cost : 0), 0);
    const stats = [
      ['Calls (30 days)', recent.length, true], ['Booked', recent.filter((c) => c.outcome === 'booked').length, false],
      ['Transferred', recent.filter((c) => c.outcome === 'transferred').length, false], ['Minutes', mins, false],
      ['Cost (USD)', '$' + cost.toFixed(2), false]
    ];
    root.querySelector('#calls-stats').innerHTML = stats.map(([l, n, hl]) => `<div class="stat ${hl ? 'hl' : ''}"><span>${l}</span><strong>${cl.data ? n : '–'}</strong></div>`).join('');

    const table = root.querySelector('#calls-table');
    if (!cl.data) { table.innerHTML = `<div class="empty">${cl.error ? `<strong>Calls unavailable</strong>${esc(cl.error)}` : 'Loading calls…'}</div>`; return; }
    if (!calls.length) { table.innerHTML = `<div class="empty"><span class="icon-tile">${icon('i-phone')}</span><strong>No calls yet</strong>When someone calls your AI number, or the AI calls someone, it appears here.</div>`; return; }
    const rows = filteredCalls();
    if (!rows.length) { table.innerHTML = '<div class="empty"><strong>No matching calls</strong>Try another filter.</div>'; return; }
    table.innerHTML = rows.map(callRow).join('');
  }

  function callRow(c) {
    const open = cl.open === c.id;
    const d = new Date(c.createdAt);
    const fresh = Date.now() - Date.parse(c.updatedAt || c.createdAt) < 45 * 60000; // no report after 45 min → stop showing it as live
    const live = c.status !== 'ended' && fresh && LIVE[c.status];
    const [olabel, ocls] = live ? [LIVE[c.status], 'live'] : OUTCOME[c.outcome] || (c.status === 'ended' ? ['Completed', ''] : ['No report', 'muted']);
    const det = c.details || {};
    return `
      <div class="call-row ${open ? 'open' : ''}" data-id="${esc(c.id)}">
        <button type="button" class="call-main" data-call="toggle" aria-expanded="${open}">
          <span class="call-dir ${c.direction}" title="${c.direction === 'outbound' ? 'Outgoing' : 'Incoming'}">${icon(c.direction === 'outbound' ? 'i-arrow' : 'i-phone')}</span>
          <span class="call-who"><strong>${esc(c.name || det.full_name || c.number || 'Unknown caller')}</strong><small>${esc(c.number || '')}${c.origin === 'website' ? ' · website call-back' : c.origin === 'test' ? ' · test call' : ''}</small></span>
          <span class="call-out"><span class="call-pill ${ocls}">${olabel}</span>${c.slotLabel ? `<small>${esc(c.slotLabel)}</small>` : ''}</span>
          <span class="call-when"><strong>${isNaN(d) ? '–' : fmtDate.format(d)}</strong><small>${isNaN(d) ? '' : fmtTime.format(d)} · ${dur(c.durationSeconds)}</small></span>
        </button>
        ${open ? `
          <div class="call-detail">
            ${c.summary ? `<p class="call-summary">${esc(c.summary)}</p>` : ''}
            ${c.recordingUrl ? `<audio controls preload="none" src="${esc(c.recordingUrl)}"></audio>` : ''}
            <dl class="lead-detail">
              ${[['Business', det.business_name], ['Email', det.email], ['Needs', det.needs], ['Volume', det.volume], ['Timeline', det.timeline],
                ['Interest', det.interest && `${det.interest}${c.score !== undefined ? ` · score ${c.score}` : ''}`], ['Follow-up', det.follow_up],
                ['Reason for call', c.reason], ['Ended because', c.endedReason], ['Cost', typeof c.cost === 'number' ? '$' + c.cost.toFixed(3) : '']]
                .filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
            </dl>
            ${c.transcript ? `<details class="call-transcript"><summary>Transcript</summary><pre>${esc(c.transcript)}</pre></details>` : ''}
            <div class="lead-actions">
              ${c.number ? `<button type="button" class="btn btn-outline btn-sm" data-call="again">${icon('i-phone')}Call again</button>` : ''}
              <button type="button" class="btn btn-outline btn-sm" data-call="ask-delete">${icon('i-trash')}Delete</button>
            </div>
            ${cl.confirm === c.id ? `<div class="confirm-del" role="alert"><span>Delete this call record and transcript? This can't be undone.</span>
              <button type="button" class="btn btn-danger" data-call="delete">Delete</button><button type="button" class="btn btn-outline" data-call="cancel">Cancel</button></div>` : ''}
          </div>` : ''}
      </div>`;
  }

  async function onCallClick(e) {
    const btn = e.target.closest('[data-call]');
    if (!btn) return;
    const id = btn.closest('[data-id]')?.dataset.id;
    const c = (cl.data?.calls || []).find((x) => x.id === id);
    if (!c) return;
    const act = btn.dataset.call;
    if (act === 'toggle') { cl.open = cl.open === id ? null : id; cl.confirm = null; renderCalls(); }
    else if (act === 'ask-delete') { cl.confirm = id; renderCalls(); }
    else if (act === 'cancel') { cl.confirm = null; renderCalls(); }
    else if (act === 'again') {
      root.querySelector('#cn-name').value = c.name || '';
      root.querySelector('#cn-number').value = c.number || '';
      root.querySelector('#cn-reason').value = c.reason || '';
      root.querySelector('#call-now').scrollIntoView({ behavior: 'smooth', block: 'center' });
      root.querySelector('#cn-consent').focus();
    } else if (act === 'delete') {
      btn.setAttribute('aria-busy', 'true');
      try { await S.calls.remove(id); cl.data.calls = cl.data.calls.filter((x) => x.id !== id); cl.confirm = null; cl.open = null; renderCalls(); }
      catch (err) { if (!callAuthErr(err)) { btn.removeAttribute('aria-busy'); btn.textContent = 'Couldn’t delete. Try again'; } }
    }
  }

  async function placeCall(test) {
    const form = root.querySelector('#call-now');
    const number = root.querySelector('#cn-number');
    const consent = root.querySelector('#cn-consent');
    const out = root.querySelector('#cn-state');
    out.className = 'save-state err';
    if (!number.value.trim()) {
      form.classList.add('was-submitted'); number.setAttribute('aria-invalid', 'true');
      out.textContent = test ? 'Enter your own phone number above, then press Test call.' : 'Enter the phone number to call.';
      number.focus(); return;
    }
    if (!test && !consent.checked) { out.textContent = 'Tick the box to confirm this person agreed to be called.'; consent.focus(); return; }
    const btn = test ? root.querySelector('#cn-test') : form.querySelector('button[type="submit"]');
    btn.setAttribute('aria-busy', 'true');
    out.className = 'save-state'; out.textContent = 'Starting the call…';
    try {
      const call = await S.calls.call({
        number: number.value.trim(), name: test ? (root.querySelector('#cn-name').value.trim() || 'Test') : root.querySelector('#cn-name').value.trim(),
        reason: test ? 'a quick test of your AI phone agent' : root.querySelector('#cn-reason').value.trim(), consent: true, test
      });
      out.className = 'save-state ok'; out.textContent = `Calling ${call.number} now. The call appears in the list below.`;
      form.reset(); form.classList.remove('was-submitted'); number.removeAttribute('aria-invalid');
      loadCalls(true);
    } catch (err) {
      if (callAuthErr(err)) return;
      out.className = 'save-state err'; out.textContent = err.message || 'The call couldn’t be started. Please try again.';
    } finally { btn.removeAttribute('aria-busy'); }
  }

  const AGENT_FIELDS = ['agentName', 'voiceId', 'greeting', 'outboundGreeting', 'knowledge', 'questions', 'transferNumber', 'callStart', 'callEnd', 'maxMinutes'];
  const AGENT_TOGGLES = ['autoCallLeads', 'recordCalls', 'emailSummaries'];
  function fillAgent(s, voices) {
    const sel = root.querySelector('#ag-voiceId');
    if (sel && !sel.options.length) sel.innerHTML = (voices || []).map((v) => `<option>${esc(v)}</option>`).join('');
    AGENT_FIELDS.forEach((k) => { const el = root.querySelector('#ag-' + k); if (el) el.value = s[k] ?? ''; });
    AGENT_TOGGLES.forEach((k) => { const el = root.querySelector('#ag-' + k); if (el) el.checked = !!s[k]; });
    root.querySelectorAll('#agent-settings input[name="callDays"]').forEach((el) => { el.checked = (s.callDays || []).includes(Number(el.value)); });
  }
  async function saveAgent(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const out = root.querySelector('#agent-state');
    const settings = {};
    AGENT_FIELDS.forEach((k) => { settings[k] = root.querySelector('#ag-' + k).value.trim(); });
    AGENT_TOGGLES.forEach((k) => { settings[k] = root.querySelector('#ag-' + k).checked; });
    settings.maxMinutes = Number(settings.maxMinutes);
    settings.callDays = [...form.querySelectorAll('input[name="callDays"]:checked')].map((el) => Number(el.value));
    const btn = form.querySelector('button[type="submit"]');
    btn.setAttribute('aria-busy', 'true'); out.className = 'save-state'; out.textContent = 'Saving…';
    try {
      const saved = await S.calls.saveSettings(settings);
      cl.settingsDirty = false;
      if (cl.data) cl.data.settings = saved;
      fillAgent(saved);
      out.className = 'save-state ok'; out.textContent = 'Saved. The next call uses these settings.';
    } catch (err) {
      if (callAuthErr(err)) return;
      out.className = 'save-state err'; out.textContent = err.message || 'Couldn’t save. Please try again.';
    } finally { btn.removeAttribute('aria-busy'); }
  }

  /* ---------- Demo invites ---------- */
  const inv = { list: [], loaded: false, error: '', confirm: null, fresh: null };
  const fmtDT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const STATE_LABEL = { active: 'Active', expired: 'Expired', revoked: 'Switched off' };
  const ago = (iso) => {
    if (!iso) return 'Not opened yet';
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'Opened just now';
    if (m < 60) return `Opened ${m} min ago`;
    if (m < 1440) return `Opened ${Math.round(m / 60)} h ago`;
    return `Opened ${fmtDate.format(new Date(iso))}`;
  };
  const shareText = (i) => `Hi ${i.name.split(' ')[0]}, here is your private ELEVNSI demo: ${i.link}`;

  function bindInvites() {
    const form = root.querySelector('#inv-form');
    form.addEventListener('submit', createInvite);
    form.querySelector('#inv-name').addEventListener('input', (e) => e.target.setAttribute('aria-invalid', 'false'));
    root.querySelector('#inv-refresh').addEventListener('click', loadInvites);
    root.querySelector('#inv-table').addEventListener('click', onInviteClick);
    root.querySelector('#inv-new').addEventListener('click', onInviteClick);
  }

  async function loadInvites() {
    const state = root.querySelector('#inv-state');
    if (state) { state.textContent = 'Loading…'; state.className = 'save-state'; }
    try { inv.list = await S.invites.list(); inv.error = ''; }
    catch (err) {
      if (err.code === 'unauthorized') { built = false; return renderLogin('Your session ended. Please sign in again.'); }
      inv.error = err.message || 'Invites could not be loaded.';
    }
    inv.loaded = true;
    if (state) state.textContent = '';
    renderInvites();
  }

  async function createInvite(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.querySelector('#inv-name');
    form.classList.add('was-submitted');
    if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Creating…';
    try {
      const created = await S.invites.create({ name: name.value.trim(), note: form.querySelector('#inv-note').value.trim(), days: Number(form.querySelector('#inv-days').value) });
      inv.list.unshift(created);
      inv.fresh = created.code;
      form.reset(); form.classList.remove('was-submitted');
      renderInvites();
      root.querySelector('#inv-new [data-inv="copy"]')?.focus();
    } catch (err) {
      if (err.code === 'unauthorized') { built = false; return renderLogin('Your session ended. Please sign in again.'); }
      const out = root.querySelector('#inv-state'); out.textContent = err.message || 'Couldn’t create the link. Please try again.'; out.className = 'save-state err';
    } finally { btn.removeAttribute('aria-busy'); btn.textContent = 'Create link'; }
  }

  function renderInvites() {
    if (!built || access.mode !== 'api') return;
    const list = inv.list;
    const stats = [
      ['Active links', list.filter((i) => i.state === 'active').length, true],
      ['Opened', list.filter((i) => i.firstOpenedAt).length, false],
      ['Total views', list.reduce((n, i) => n + (i.views || 0), 0), false]
    ];
    root.querySelector('#inv-stats').innerHTML = stats.map(([l, n, hl]) => `<div class="stat ${hl ? 'hl' : ''}"><span>${l}</span><strong>${inv.loaded ? n : '–'}</strong></div>`).join('');

    // The link that was just created, ready to copy or send
    const fresh = list.find((i) => i.code === inv.fresh);
    const box = root.querySelector('#inv-new');
    box.hidden = !fresh;
    if (fresh) {
      box.dataset.code = fresh.code;
      box.innerHTML = `
        <p><strong>Link for ${esc(fresh.name)} is ready.</strong> Only people with this link can open the demo.</p>
        <input class="input inv-link" readonly value="${esc(fresh.link)}" aria-label="Invite link for ${esc(fresh.name)}">
        <div class="inv-share">
          <button type="button" class="btn btn-dark btn-sm" data-inv="copy">Copy link</button>
          <a class="btn btn-outline btn-sm" href="https://wa.me/?text=${encodeURIComponent(shareText(fresh))}" target="_blank" rel="noopener">${icon('i-whatsapp')}WhatsApp</a>
          <a class="btn btn-outline btn-sm" href="mailto:?subject=${encodeURIComponent('Your private ELEVNSI demo')}&body=${encodeURIComponent(shareText(fresh))}">${icon('i-mail')}Email</a>
        </div>`;
    }

    const table = root.querySelector('#inv-table');
    if (!inv.loaded) { table.innerHTML = '<div class="empty">Loading invites…</div>'; return; }
    if (inv.error && !list.length) { table.innerHTML = `<div class="empty"><strong>Invites unavailable</strong>${esc(inv.error)}</div>`; return; }
    if (!list.length) {
      table.innerHTML = `<div class="empty"><span class="icon-tile">${icon('i-shield')}</span><strong>No invite links yet</strong>Create a link for the first person you want to show the demo to.</div>`;
      return;
    }
    table.innerHTML = list.map((i) => `
      <div class="inv-row" data-code="${esc(i.code)}">
        <div class="inv-who"><strong>${esc(i.name)}</strong><small>${esc(i.note || 'No note')}</small></div>
        <div class="inv-meta">
          <span class="inv-pill ${i.state}">${STATE_LABEL[i.state] || i.state}</span>
          <small>${i.state === 'revoked' ? 'Access ended' : i.expiresAt ? `${i.state === 'expired' ? 'Expired' : 'Expires'} ${fmtDT.format(new Date(i.expiresAt))}` : 'No expiry'}</small>
        </div>
        <div class="inv-seen"><strong>${esc(ago(i.lastOpenedAt))}</strong><small>${i.views || 0} view${i.views === 1 ? '' : 's'} · created ${fmtDate.format(new Date(i.createdAt))}</small></div>
        <div class="inv-actions">
          <button type="button" class="btn btn-outline btn-sm" data-inv="copy">Copy link</button>
          ${i.state === 'revoked'
            ? '<button type="button" class="btn btn-outline btn-sm" data-inv="restore">Switch on</button>'
            : i.state === 'expired'
              ? '<button type="button" class="btn btn-outline btn-sm" data-inv="extend">Extend 7 days</button>'
              : '<button type="button" class="btn btn-outline btn-sm" data-inv="revoke">Switch off</button>'}
          <button type="button" class="icon-btn" data-inv="ask-delete" aria-label="Delete link for ${esc(i.name)}">${icon('i-trash')}</button>
        </div>
        ${inv.confirm === i.code ? `
          <div class="confirm-del" role="alert">
            <span>Delete the link for ${esc(i.name)}? It will stop working and its history is removed.</span>
            <button type="button" class="btn btn-danger" data-inv="delete">Delete</button>
            <button type="button" class="btn btn-outline" data-inv="cancel">Cancel</button>
          </div>` : ''}
      </div>`).join('');
  }

  async function onInviteClick(e) {
    const btn = e.target.closest('[data-inv]');
    if (!btn) return;
    const code = btn.closest('[data-code]')?.dataset.code;
    const item = inv.list.find((i) => i.code === code);
    if (!item) return;
    const act = btn.dataset.inv;
    const out = root.querySelector('#inv-state');
    const replace = (next) => { inv.list = inv.list.map((i) => (i.code === next.code ? next : i)); renderInvites(); };
    try {
      if (act === 'copy') {
        try { await navigator.clipboard.writeText(item.link); btn.textContent = 'Copied'; }
        catch (_) { const field = root.querySelector('#inv-new .inv-link'); if (field && inv.fresh === code) { field.select(); btn.textContent = 'Selected, press Ctrl+C'; } else { prompt('Copy this link:', item.link); } }
        setTimeout(() => { btn.textContent = 'Copy link'; }, 2000);
      } else if (act === 'revoke' || act === 'restore') {
        btn.setAttribute('aria-busy', 'true');
        replace(await S.invites.update(code, { revoked: act === 'revoke' }));
        out.textContent = act === 'revoke' ? `${item.name}'s link is switched off.` : `${item.name}'s link works again.`; out.className = 'save-state ok';
      } else if (act === 'extend') {
        btn.setAttribute('aria-busy', 'true');
        replace(await S.invites.update(code, { days: 7 }));
        out.textContent = `${item.name}'s link works for 7 more days.`; out.className = 'save-state ok';
      } else if (act === 'ask-delete') { inv.confirm = code; renderInvites(); root.querySelector(`[data-code="${CSS.escape(code)}"] [data-inv="cancel"]`)?.focus(); }
      else if (act === 'cancel') { inv.confirm = null; renderInvites(); }
      else if (act === 'delete') {
        btn.setAttribute('aria-busy', 'true');
        await S.invites.remove(code);
        inv.list = inv.list.filter((i) => i.code !== code);
        inv.confirm = null; if (inv.fresh === code) inv.fresh = null;
        renderInvites();
        out.textContent = 'Link deleted.'; out.className = 'save-state ok';
      }
    } catch (err) {
      if (err.code === 'unauthorized') { built = false; return renderLogin('Your session ended. Please sign in again.'); }
      btn.removeAttribute('aria-busy');
      out.textContent = err.message || 'That didn’t work. Please try again.'; out.className = 'save-state err';
    }
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
      }, (err) => {
        loaded = true; clearTimeout(loadTimer);
        if (err.code === 'unauthorized') { built = false; return renderLogin('Your session ended. Please sign in again.'); }
        renderLeads(err.code === 'revoked' ? 'Your access to these leads has changed.' : (err.message || 'Leads could not be loaded.'));
      });
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
          <span class="src ${l.source === 'booking' ? 'booking' : ''}">${icon(l.source === 'booking' ? 'i-calendar' : l.source === 'call' ? 'i-phone' : 'i-mail')}${l.source === 'booking' ? (l.channel === 'phone' ? 'Booked by AI call' : 'Booking') : l.source === 'call' ? 'AI call' : 'Contact form'}</span></div>
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
            ${(l.slotLabel || l.requested_slot) ? `<div><dt>Consultation</dt><dd>${esc(l.slotLabel || l.requested_slot)}</dd></div><div><dt>Their time zone</dt><dd>${esc(l.timezone || '—')}</dd></div>` : ''}
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
    const cols = [['createdAt', 'Received'], ['status', 'Status'], ['source', 'Source'], ['full_name', 'Full name'], ['business_name', 'Business'], ['email', 'Email'], ['phone', 'Phone'], ['service', 'Service'], ['slotLabel', 'Consultation'], ['timezone', 'Time zone'], ['message', 'Message']];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => cell(c[1])).join(','), ...rows.map((l) => cols.map(([k]) => cell(k === 'slotLabel' ? (l.slotLabel || l.requested_slot) : l[k])).join(','))].join('\r\n');
    try {
      await S.saveFile(`elevnsi-leads-${new Date().toISOString().slice(0, 10)}.csv`, '' + csv);
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
      if (err && err.code === 'unauthorized') { built = false; return renderLogin('Your session ended. Sign in again to save your changes.'); }
      setSaveState(err && err.code === 'invalid_argument' ? 'You don’t have permission to change these details.'
        : (err && err.code === 'invalid' && err.message) || 'Couldn’t save. Please try again.', 'err');
    } finally { btn.removeAttribute('aria-busy'); }
  }
})();
