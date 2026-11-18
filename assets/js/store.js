/*
 * ELEVNSI data layer: leads + editable contact details.
 *
 * "live"  = running as a published Claude artifact: data is kept in the
 *           artifact's shared database (leads visible to admins only).
 * "local" = any other host (local preview, your own web host): data is kept
 *           in this browser only. Connect a real backend before relying on it.
 */
window.ElevStore = (() => {
  const C = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
  const use = (name) => (C ? C.use(name).catch(() => null) : Promise.resolve(null));

  const LS_LEADS = 'elevnsi.leads';
  const LS_CONTACT = 'elevnsi.contact';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };
  const localSubs = new Set();
  const emitLocal = () => localSubs.forEach((fn) => fn());
  addEventListener('storage', (e) => { if (e.key === LS_LEADS || e.key === LS_CONTACT) emitLocal(); });

  let ctxP = null;
  function ctx() {
    if (!ctxP) {
      ctxP = (async () => {
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

  /* ---------- Access ---------- */
  async function access() {
    const { db, user, mode } = await ctx();
    if (mode === 'local') return { mode, canAdmin: true };
    let canAdmin = false;
    try { canAdmin = user ? await user.canEdit() : false; } catch (_) {}
    return { mode, canAdmin, hasDb: !!db };
  }

  /* ---------- Leads ---------- */
  async function addLead(lead) {
    const entry = { id: newId(), createdAt: new Date().toISOString(), status: 'new', ...lead };
    const { db, uid } = await ctx();
    if (db && uid) {
      try {
        // Each visitor writes only their own document (leads/<their id>); admins read all.
        const ref = db.doc('leads/' + uid);
        const snap = await ref.get();
        const entries = snap.exists ? clone(snap.data().entries || []) : [];
        entries.push(entry);
        await ref.set({ updatedAt: entry.createdAt, entries });
        return { stored: 'live' };
      } catch (err) {
        console.warn('[ELEVNSI] Could not save lead to the shared database', err);
      }
    }
    const all = ls.get(LS_LEADS, []);
    all.push(entry);
    ls.set(LS_LEADS, all);
    emitLocal();
    return { stored: 'local' };
  }

  /** cb(leads[], {fromCache}) — newest first. Returns an unsubscribe. */
  function watchLeads(cb, onError) {
    let unsub = () => {};
    let stopped = false;
    ctx().then(({ db, mode }) => {
      if (stopped) return;
      if (mode === 'live') {
        unsub = db.collection('leads').onSnapshot((snap) => {
          const out = [];
          snap.docs.forEach((d) => (d.data().entries || []).forEach((e) => out.push({ ...e, _doc: d.id })));
          out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          cb(out, { fromCache: snap.metadata.fromCache });
        }, (e) => onError && onError(e));
      } else {
        const push = () => cb(ls.get(LS_LEADS, []).map((e) => ({ ...e, _doc: 'local' })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), { fromCache: false });
        localSubs.add(push); push();
        unsub = () => localSubs.delete(push);
      }
    });
    return () => { stopped = true; unsub(); };
  }

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
  const updateLead = (lead, patch) => mutateLead(lead, (list) => list.map((e) => (e.id === lead.id ? { ...e, ...patch } : e)));
  const deleteLead = (lead) => mutateLead(lead, (list) => list.filter((e) => e.id !== lead.id));

  /* ---------- Contact details ---------- */
  function watchContact(cb) {
    let unsub = () => {};
    let stopped = false;
    ctx().then(({ db, mode }) => {
      if (stopped) return;
      if (mode === 'live') {
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

  return { access, addLead, watchLeads, updateLead, deleteLead, watchContact, saveContact, saveFile, mode: () => ctx().then((c) => c.mode) };
})();
