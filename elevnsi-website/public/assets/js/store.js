/*
 * ELEVNSI data layer: leads, bookings, contact details, admin sign-in.
 *
 * Modes (chosen automatically):
 *  "api"   = deployed on Vercel (or `vercel dev`): the site's own backend in /api.
 *            Leads are stored in Upstash Redis, emails go out, admin needs a password.
 *  "live"  = running as a published Claude artifact (artifact database).
 *  "local" = opened as a plain file / simple local server: saved in this browser only (preview).
 */
window.ElevStore = (() => {
  const CFG = window.ELEVNSI_CONFIG || {};
  const API = String(CFG.apiBase || '/api').replace(/\/$/, '');
  const C = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
  const use = (name) => (C ? C.use(name).catch(() => null) : Promise.resolve(null));
  const onWebHost = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const localDevServer = ['3000', '8888'].includes(location.port); // `vercel dev` (3000) or the test server
  const wantsApi = ['server', 'vercel', 'netlify'].includes(CFG.backend) && (onWebHost || localDevServer) && !/claude(usercontent)?\.(ai|com)$/.test(location.hostname);

  /* ---------- small storage helpers ---------- */
  const LS_LEADS = 'elevnsi.leads';
  const LS_CONTACT = 'elevnsi.contact';
  const TOKEN = 'elevnsi.admin.token';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch (_) {} }
  };
  let memToken = null;
  const getToken = () => memToken || ss.get(TOKEN);
  const setToken = (t) => { memToken = t; ss.set(TOKEN, t); };

  const localSubs = new Set();
  const emitLocal = () => localSubs.forEach((fn) => fn());
  addEventListener('storage', (e) => { if (e.key === LS_LEADS || e.key === LS_CONTACT) emitLocal(); });

  /* ---------- API helper ---------- */
  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (auth && getToken()) headers.Authorization = 'Bearer ' + getToken();
    let res;
    try { res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch (_) { throw { code: 'network', message: 'Could not reach the server. Check your connection and try again.' }; }
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401 && auth) setToken(null);
      throw { code: data.error || 'http_' + res.status, status: res.status, message: data.message || 'Something went wrong. Please try again.', errors: data.errors };
    }
    return data;
  }

  /* ---------- Mode ---------- */
  let ctxP = null;
  function ctx() {
    if (!ctxP) {
      ctxP = (async () => {
        if (wantsApi) return { mode: 'api' };
        const [db, user] = await Promise.all([use('db'), use('user')]);
        let uid = null;
        try { uid = user ? await user.id() : null; } catch (_) {}
        return { db, user, uid, mode: db ? 'live' : 'local' };
      })();
    }
    return ctxP;
  }
  const newId = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Access / sign-in ---------- */
  async function access() {
    const { mode, user, db } = await ctx();
    if (mode === 'api') return { mode, canAdmin: !!getToken(), needsLogin: !getToken() };
    if (mode === 'local') return { mode, canAdmin: true };
    let canAdmin = false;
    try { canAdmin = user ? await user.canEdit() : false; } catch (_) {}
    return { mode, canAdmin, hasDb: !!db };
  }
  async function login(password) {
    const { token } = await api('/admin/login', { method: 'POST', body: { password } });
    setToken(token);
    return true;
  }
  const logout = () => setToken(null);

  /* ---------- Leads ---------- */
  async function addLead(lead) {
    const c = await ctx();
    if (c.mode === 'api') return api('/lead', { method: 'POST', body: lead });
    const entry = { id: newId(), createdAt: new Date().toISOString(), status: 'new', ...lead };
    if (c.db && c.uid) {
      try {
        const ref = c.db.doc('leads/' + c.uid);
        const snap = await ref.get();
        const entries = snap.exists ? clone(snap.data().entries || []) : [];
        entries.push(entry);
        await ref.set({ updatedAt: entry.createdAt, entries });
        return { ok: true, stored: 'live' };
      } catch (err) { console.warn('[ELEVNSI] Could not save lead to the shared database', err); }
    }
    const all = ls.get(LS_LEADS, []);
    all.push(entry);
    ls.set(LS_LEADS, all);
    emitLocal();
    return { ok: true, stored: 'local' };
  }

  let refreshApiLeads = null;
  /** cb(leads[], {fromCache}) newest first. Returns an unsubscribe function. */
  function watchLeads(cb, onError) {
    let unsub = () => {};
    let stopped = false;
    const sortDesc = (list) => list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    ctx().then(({ db, mode }) => {
      if (stopped) return;
      if (mode === 'api') {
        const load = async () => {
          try {
            const { leads } = await api('/admin/leads', { auth: true });
            if (!stopped) cb(leads.map((l) => ({ ...l, _doc: 'api' })), { fromCache: false });
          } catch (err) { if (!stopped && onError) onError(err); }
        };
        refreshApiLeads = load;
        load();
        const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
        const onVis = () => document.visibilityState === 'visible' && load();
        document.addEventListener('visibilitychange', onVis);
        unsub = () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); refreshApiLeads = null; };
      } else if (mode === 'live') {
        unsub = db.collection('leads').onSnapshot((snap) => {
          const out = [];
          snap.docs.forEach((d) => (d.data().entries || []).forEach((e) => out.push({ ...e, _doc: d.id })));
          cb(sortDesc(out), { fromCache: snap.metadata.fromCache });
        }, (e) => onError && onError(e));
      } else {
        const push = () => cb(sortDesc(ls.get(LS_LEADS, []).map((e) => ({ ...e, _doc: 'local' }))), { fromCache: false });
        localSubs.add(push); push();
        unsub = () => localSubs.delete(push);
      }
    });
    return () => { stopped = true; unsub(); };
  }
  const refreshLeads = () => refreshApiLeads && refreshApiLeads();

  async function mutateLead(lead, fn) {
    const { db, mode } = await ctx();
    if (mode === 'live') {
      const ref = db.doc('leads/' + lead._doc);
      const snap = await ref.get();
      if (!snap.exists) return;
      const entries = fn(clone(snap.data().entries || []));
      if (entries.length) await ref.set({ ...snap.data(), entries, updatedAt: new Date().toISOString() });
      else await ref.delete();
    } else {
      ls.set(LS_LEADS, fn(ls.get(LS_LEADS, [])));
      emitLocal();
    }
  }
  async function updateLead(lead, patch) {
    if ((await ctx()).mode === 'api') { await api('/admin/leads', { method: 'PATCH', body: { id: lead.id, ...patch }, auth: true }); refreshLeads(); return; }
    return mutateLead(lead, (list) => list.map((e) => (e.id === lead.id ? { ...e, ...patch } : e)));
  }
  async function deleteLead(lead) {
    if ((await ctx()).mode === 'api') { await api('/admin/leads?id=' + encodeURIComponent(lead.id), { method: 'DELETE', auth: true }); refreshLeads(); return; }
    return mutateLead(lead, (list) => list.filter((e) => e.id !== lead.id));
  }

  /* ---------- Booking slots (api mode only) ---------- */
  async function getSlots() {
    if ((await ctx()).mode !== 'api') return null;
    return api('/slots');
  }

  /* ---------- Contact details ---------- */
  function watchContact(cb) {
    let unsub = () => {};
    let stopped = false;
    ctx().then(({ db, mode }) => {
      if (stopped) return;
      if (mode === 'api') {
        api('/settings').then((d) => !stopped && cb(d || {})).catch(() => {});
      } else if (mode === 'live') {
        unsub = db.doc('site/contact').onSnapshot((s) => cb(s.exists ? s.data() : {}), () => cb(ls.get(LS_CONTACT, {})));
      } else {
        const push = () => cb(ls.get(LS_CONTACT, {}));
        localSubs.add(push); push();
        unsub = () => localSubs.delete(push);
      }
    });
    return () => { stopped = true; unsub(); };
  }
  async function saveContact(data) {
    const { db, mode } = await ctx();
    if (mode === 'api') return api('/settings', { method: 'PUT', body: data, auth: true });
    const body = { ...data, updatedAt: new Date().toISOString() };
    if (mode === 'live') await db.doc('site/contact').set(body);
    else { ls.set(LS_CONTACT, body); emitLocal(); }
  }

  /* ---------- File export ---------- */
  async function saveFile(filename, text) {
    const dl = await use('downloads');
    if (dl) return dl.save({ filename, data: text });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return { status: 'saved' };
  }

  return {
    access, login, logout, addLead, watchLeads, refreshLeads, updateLead, deleteLead,
    getSlots, watchContact, saveContact, saveFile, mode: () => ctx().then((c) => c.mode)
  };
})();
