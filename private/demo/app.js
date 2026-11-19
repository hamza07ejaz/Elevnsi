/* ELEVNSI Console prototype: navigation + scripted demos. No data is saved or sent. */
(() => {
  'use strict';
  const D = window.DEMO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = reduced ? 0.6 : 1;
  const icon = (id, cls = 'sm') => `<svg class="ic ${cls}"><use href="#${id}"/></svg>`;
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  /* ---------- run control (cancellable demo scripts) ---------- */
  const STOP = Symbol('stop');
  const runs = {};
  function newRun(key) {
    cancelRun(key);
    const r = { off: false, timers: [] };
    r.wait = (ms) => new Promise((res, rej) => {
      if (r.off) return rej(STOP);
      r.timers.push(setTimeout(() => (r.off ? rej(STOP) : res()), ms * SPEED));
    });
    r.every = (ms, fn) => r.timers.push(setInterval(fn, ms));
    runs[key] = r;
    return r;
  }
  function cancelRun(key) {
    const r = runs[key];
    if (r) { r.off = true; r.timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); }
    runs[key] = null;
  }
  const isRunning = (key) => !!runs[key];

  function setPlaying(key, on) {
    $$(`[data-play="${key}"]`).forEach((b) => {
      b.disabled = on;
      b.classList.toggle('running', on);
      b.innerHTML = on ? `${icon('i-refresh')}Playing…` : `${icon('i-play', 'sm fill')}${b.dataset.label || 'Play demo'}`;
    });
  }
  $$('[data-play]').forEach((b) => { b.dataset.label = b.textContent.trim(); });

  async function play(key) {
    if (isRunning(key)) return;
    resetView(key);
    const run = newRun(key);
    setPlaying(key, true);
    try { await SCRIPTS[key](run); }
    catch (e) { if (e !== STOP) console.error(e); }
    finally { if (runs[key] === run) runs[key] = null; setPlaying(key, false); }
  }
  function resetView(key) {
    cancelRun(key);
    setPlaying(key, false);
    RESETS[key]?.();
  }

  /* ---------- toasts ---------- */
  function toast(title, text, ic = 'i-check') {
    const el = h(`<div class="toast" role="status"><span class="t-ic">${icon(ic)}</span><div><b>${title}</b><p>${text}</p></div></div>`);
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 4200);
  }

  /* ---------- chat helper ---------- */
  function chat(el) {
    let clock = 10 * 60 + 42;
    const time = () => { const hh = Math.floor(clock / 60), mm = clock % 60; clock += 1; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
    const add = (node) => { el.appendChild(node); el.scrollTop = el.scrollHeight; return node; };
    return {
      setClock(min) { clock = min; },
      clear() { el.innerHTML = ''; },
      them(text) { return add(h(`<div class="msg them"></div>`)).append(text, h(`<small>${time()}</small>`)); },
      ai(text) {
        const m = add(h(`<div class="msg ai"><span class="who">${icon('i-spark')}ELEVNSI AI</span></div>`));
        m.append(text, h(`<small>${time()}</small>`));
        el.scrollTop = el.scrollHeight;
      },
      sys(text, ic = 'i-check', gap = false) { add(h(`<div class="sysmsg${gap ? ' gap' : ''}">${icon(ic)}<span></span></div>`)).lastElementChild.textContent = text; },
      async typing(run, right, ms) {
        const t = add(h(`<div class="typing${right ? ' right' : ''}" aria-hidden="true"><i></i><i></i><i></i></div>`));
        try { await run.wait(ms); } finally { t.remove(); }
      },
      start(title, text) {
        el.innerHTML = '';
        el.appendChild(h(`<div class="chat-start"><span class="sys-ic">${icon('i-spark', 'lg')}</span><b>${title}</b><span>${text}</span></div>`));
      }
    };
  }
  const typeTime = (text, ai) => Math.min(ai ? 2300 : 1600, (ai ? 650 : 500) + text.length * (ai ? 16 : 22));

  /* ================= ROUTER ================= */
  const views = $$('.view').map((v) => v.id.replace('view-', ''));
  const routeHooks = [];
  let current = null;
  let autoplay = null;
  function route() {
    const id = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
    if (id === current) return;
    if (current && isRunning(current)) resetView(current);
    current = id;
    views.forEach((v) => { $(`#view-${v}`).hidden = v !== id; });
    const view = $(`#view-${id}`);
    $('#page-title').textContent = view.dataset.title;
    $('#client-name').textContent = view.dataset.client;
    document.title = `${view.dataset.title} · ELEVNSI Console`;
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    closeMenu();
    window.scrollTo({ top: 0 });
    if (autoplay === id) { autoplay = null; setTimeout(() => play(id), 350); }
    routeHooks.forEach((f) => f(id));
  }
  addEventListener('hashchange', route);
  $$('[data-autoplay]').forEach((a) => a.addEventListener('click', () => { autoplay = a.dataset.autoplay; }));

  /* mobile menu */
  const side = $('#side'), scrim = $('#scrim'), menuBtn = $('#menu-btn');
  function closeMenu() { side.classList.remove('open'); scrim.classList.remove('show'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => { const o = !side.classList.contains('open'); side.classList.toggle('open', o); scrim.classList.toggle('show', o); menuBtn.setAttribute('aria-expanded', String(o)); });
  scrim.addEventListener('click', closeMenu);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* generic buttons */
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-play]'); if (p) return play(p.dataset.play);
    const r = e.target.closest('[data-reset]'); if (r) return resetView(r.dataset.reset);
    const f = e.target.closest('[data-fake]'); if (f) return toast('Prototype', f.dataset.fake, 'i-spark');
    const s = e.target.closest('.send'); if (s) return toast('Prototype', 'In the full product your team can step in and reply here.', 'i-spark');
  });

  /* ================= OVERVIEW ================= */
  function sparkPath(vals, w = 200, hgt = 36) {
    const max = Math.max(...vals), min = Math.min(...vals), pad = 3;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, pad + (1 - (v - min) / (max - min || 1)) * (hgt - pad * 2)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return { line, area: `${line} L${w} ${hgt} L0 ${hgt} Z`, end: pts[pts.length - 1] };
  }
  function renderKpis(range) {
    $('#kpis').innerHTML = D.kpis[range].map((k, i) => {
      const s = sparkPath(k.spark);
      return `<article class="card kpi">
        <div class="kpi-top"><span>${k.label}</span>${icon(k.icon)}</div>
        <div class="kpi-val"><strong class="num">${k.value}</strong><span class="delta">${icon('i-trend')}${k.delta}</span></div>
        <svg class="spark" viewBox="0 0 200 36" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="sg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b5ff24" stop-opacity=".45"/><stop offset="1" stop-color="#b5ff24" stop-opacity="0"/></linearGradient></defs>
          <path d="${s.area}" fill="url(#sg${i})"/><path d="${s.line}" fill="none" stroke="#7cc400" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
        <small>${k.note}</small>
      </article>`;
    }).join('');
  }
  $$('[data-range]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderKpis(b.dataset.range);
  }));

  function renderChart() {
    const W = 640, H = 250, L = 30, R = 8, T = 16, B = 28, max = 10;
    const cw = (W - L - R) / D.week.length, y = (v) => T + (1 - v / max) * (H - T - B);
    let s = '';
    for (let v = 0; v <= max; v += 2) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    D.week.forEach((d, i) => {
      const x = L + i * cw + cw / 2, bw = Math.min(22, cw / 3.4);
      s += `<rect class="bar-a" x="${x - bw - 2}" y="${y(d.leads)}" width="${bw}" height="${y(0) - y(d.leads)}" rx="4"><title>${d.d}: ${d.leads} new leads</title></rect>`;
      s += `<rect class="bar-b" x="${x + 2}" y="${y(d.booked)}" width="${bw}" height="${y(0) - y(d.booked)}" rx="4"><title>${d.d}: ${d.booked} booked</title></rect>`;
      s += `<text class="val" x="${x + 2 + bw / 2}" y="${y(d.booked) - 6}" text-anchor="middle">${d.booked}</text>`;
      s += `<text x="${x}" y="${H - 8}" text-anchor="middle">${d.d}</text>`;
    });
    $('#week-chart').innerHTML = s;
  }

  const feedItems = D.feed.map((f) => ({ ...f, at: Date.now() - parseInt(f.when, 10) * 60000 }));
  let feedIdx = 0;
  function ago(t) { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'Just now' : `${m} min ago`; }
  function renderFeed(newFirst) {
    $('#feed').innerHTML = feedItems.map((f, i) => `<li class="${newFirst && i === 0 ? 'new' : ''}"><span class="feed-ic${f.g ? ' g' : ''}">${icon(f.icon)}</span><p>${f.html}</p><small>${ago(f.at)}</small></li>`).join('');
  }
  setInterval(() => {
    if (current !== 'overview' || document.hidden) return;
    const n = D.feedMore[feedIdx++ % D.feedMore.length];
    feedItems.unshift({ ...n, at: Date.now() });
    feedItems.length = 5;
    renderFeed(true);
  }, 5000);

  /* ================= BOOKING ================= */
  const bkChat = chat($('#bk-chat'));
  function setStep(listSel, i) {
    $$(`${listSel} li`).forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('active', k === i); });
  }
  function renderCal() {
    const cal = $('#cal');
    let s = '<div></div>';
    D.calDays.forEach(([d, n]) => { s += `<div class="dh">${d}<b>${n}</b></div>`; });
    D.calHours.forEach((hr, r) => {
      s += `<div class="tl" style="grid-row:${r + 2};grid-column:1">${((hr + 11) % 12) + 1} ${hr >= 12 ? 'PM' : 'AM'}</div>`;
      D.calDays.forEach((_, c) => { s += `<div class="cell" id="c-${c}-${hr}" style="grid-row:${r + 2};grid-column:${c + 2}"></div>`; });
    });
    D.appts.forEach((a) => {
      s += `<div class="appt${a.ai ? ' ai-booked' : ''}" style="grid-row:${D.calHours.indexOf(a.hour) + 2};grid-column:${a.day + 2}"><b>${a.name}</b><span>${a.svc}</span></div>`;
    });
    cal.innerHTML = s;
  }
  function markOffer(on) { D.offer.forEach((o) => $(`#c-${o.day}-${o.hour}`).classList.toggle('offer', on)); }
  function addFresh() {
    const o = D.offer[0];
    $('#cal').appendChild(h(`<div class="appt fresh" style="grid-row:${D.calHours.indexOf(o.hour) + 2};grid-column:${o.day + 2}"><b>Sarah Ahmed</b><span>Cleaning · booked by AI</span></div>`));
  }
  const rowsHtml = (list) => list.map((r) => `<li><span class="mini-av">${r.ini}</span><span class="who"><b>${r.name}</b><span>${r.when}</span></span><span class="pill ${r.status[0]}">${r.status[1]}</span></li>`).join('');
  function renderBookingLists() {
    $('#bk-reminders').innerHTML = rowsHtml(D.reminders);
    $('#bk-changes').innerHTML = rowsHtml(D.changes);
    $('#bk-unfinished').innerHTML = rowsHtml(D.unfinished);
  }
  function resetBooking() {
    renderCal();
    renderBookingLists();
    setStep('#bk-flow', -1);
    bkChat.setClock(10 * 60 + 42);
    bkChat.start('Watch the AI book an appointment', 'A new lead messages ABC Dental on WhatsApp. Press Play demo to see the full conversation.');
  }
  async function runBooking(run) {
    bkChat.clear();
    for (const s of D.bookingScript) {
      if (s.step != null) setStep('#bk-flow', s.step);
      if (s.sys) {
        bkChat.sys(s.sys, s.icon);
        if (s.offer) { await run.wait(s.wait); markOffer(true); }
      }
      if (s.them) { await bkChat.typing(run, false, typeTime(s.them)); bkChat.them(s.them); }
      if (s.ai) { await bkChat.typing(run, true, typeTime(s.ai, true)); bkChat.ai(s.ai); }
      if (s.book) {
        markOffer(false); addFresh();
        $('#bk-reminders').insertAdjacentHTML('afterbegin', rowsHtml([{ name: 'Sarah Ahmed', ini: 'SA', when: 'Tue 2:00 PM · Cleaning', status: ['neutral', 'Scheduled'] }]));
        toast('New appointment booked', 'Sarah Ahmed · Teeth cleaning · Tue 24 Nov, 2:00 PM', 'i-calendar');
      }
      if (s.done) setStep('#bk-flow', 5);
      await run.wait(650);
    }
  }

  /* ================= LEADS ================= */
  const ldChat = chat($('#ld-chat'));
  let board = [];
  let selected = 'john';
  let john = null;
  const colOf = (id) => board.find((l) => l.id === id).col;

  function renderBoard(movedId) {
    $('#board').innerHTML = D.columns.map((c) => {
      const items = board.filter((l) => l.col === c.id);
      return `<section class="col" aria-label="${c.name}">
        <div class="col-head"><i style="background:${c.color}"></i>${c.name}<span>${items.length}</span></div>
        ${items.map((l) => `<button type="button" class="lead${l.id === movedId ? ' moving' : ''}" data-lead="${l.id}" aria-pressed="${l.id === selected}" style="view-transition-name:lead-${l.id}">
          <span class="lead-top"><b>${l.name}</b><span class="score${l.score >= 70 ? ' hot' : ''} num">${l.score}</span></span>
          <p>${l.need}</p>
          <span class="lead-meta"><span>${icon('i-pin')}${l.city}</span><span>· ${l.src}</span><span>· ${l.when}</span></span>
          ${l.tag ? `<span class="pill neutral" style="justify-self:start">${l.tag}</span>` : ''}
        </button>`).join('') || '<p class="empty">No leads</p>'}
      </section>`;
    }).join('');
  }
  function moveLead(id, col) {
    const l = board.find((x) => x.id === id);
    l.col = col;
    if (col === 'qualified') { l.tag = 'Sent to sales'; }
    else if (col === 'followup') { l.tag = 'Follow-up 1 of 3'; }
    else l.tag = '';
    if (document.startViewTransition && !reduced) document.startViewTransition(() => renderBoard(id));
    else renderBoard(id);
  }
  $('#board').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lead]');
    if (!b) return;
    if (isRunning('leads')) resetView('leads');
    selectLead(b.dataset.lead);
  });

  function renderQual(answered, score) {
    $('#ld-qual').innerHTML = D.qualQs.map((q) => {
      const yes = answered.has(q.id);
      return `<li class="${yes ? 'yes' : ''}"><span class="tick">${icon('i-check')}</span><span>${q.q}</span><span>${yes ? q.a : 'Waiting'}</span></li>`;
    }).join('');
    $('#ld-score').textContent = score;
    $('#ld-bar').style.width = `${score}%`;
  }
  function setStatus(kind, text) {
    const p = $('#ld-status');
    p.className = `pill ${kind}`;
    p.textContent = text;
  }
  function renderSeq(states) {
    const label = { sent: ['ok', 'Sent'], wait: ['warn', 'Scheduled'], stopped: ['neutral', 'Stopped · lead replied'], '': ['neutral', 'Pending'] };
    $('#ld-seq').innerHTML = D.sequence.map((s, i) => {
      const st = states[i] || '';
      return `<li class="${st}"><span class="tl-dot">${icon('i-check')}</span><div><b>${s.day} · ${s.title} <span class="pill ${label[st][0]}">${label[st][1]}</span></b><p>${s.text}</p></div></li>`;
    }).join('');
  }
  function headFor(l) {
    $('#ld-av').textContent = l.name.split(' ').map((w) => w[0]).join('');
    $('#ld-name').textContent = l.name;
    $('#ld-src').innerHTML = `${icon('i-message')}${l.src} · ${l.need}`;
  }
  const statusFor = { new: ['info', 'New'], interested: ['ok', 'Interested'], followup: ['warn', 'Follow-up needed'], qualified: ['ok', 'Qualified'], no: ['bad', 'Not qualified'] };

  function selectLead(id) {
    selected = id;
    $$('[data-lead]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lead === id)));
    const l = board.find((x) => x.id === id);
    headFor(l);
    if (id === 'john') { showJohnStart(); return; }
    ldChat.clear();
    (D.leadChats[id] || []).forEach((m) => { if (m.them) ldChat.them(m.them); if (m.ai) ldChat.ai(m.ai); if (m.sys) ldChat.sys(m.sys, m.icon, m.gap); });
    const n = Math.round(l.score / 20);
    renderQual(new Set(D.qualQs.slice(0, n).map((q) => q.id)), l.score);
    setStatus(...statusFor[l.col]);
    renderSeq(l.col === 'followup' ? ['sent', 'sent', 'wait', ''] : l.col === 'new' ? ['sent', 'wait', '', ''] : ['sent', 'stopped', 'stopped', 'stopped']);
    $('#ld-pill').innerHTML = `${icon('i-spark')}${l.col === 'qualified' ? 'With sales team' : l.col === 'no' ? 'Closed by AI' : 'AI qualifying'}`;
  }
  function showJohnStart() {
    ldChat.setClock(9 * 60 + 15);
    ldChat.start('Watch the AI qualify a lead', 'John asks Northline Roofing for a new roof. Press Play demo to see the questions, the follow-up and the hand-off to sales.');
    renderQual(new Set(), 0);
    setStatus('info', 'New');
    renderSeq(['', '', '', '']);
    $('#ld-pill').innerHTML = `${icon('i-spark')}AI qualifying`;
  }
  function resetLeads() {
    board = D.leads.map((l) => ({ ...l }));
    selected = 'john';
    renderBoard();
    headFor(board[0]);
    showJohnStart();
  }
  async function runLeads(run) {
    ldChat.clear();
    const answered = new Set();
    let score = 0;
    const seq = ['', '', '', ''];
    for (const s of D.leadScript) {
      if (s.sys) { ldChat.sys(s.sys, s.icon, s.gap); if (s.wait) await run.wait(s.wait); }
      if (s.them) { await ldChat.typing(run, false, typeTime(s.them)); ldChat.them(s.them); }
      if (s.ai) { await ldChat.typing(run, true, typeTime(s.ai, true)); ldChat.ai(s.ai); }
      if (s.seq === 0) { seq[0] = 'sent'; seq[1] = 'wait'; renderSeq(seq); }
      if (s.seq === 1) { seq[1] = 'sent'; seq[2] = 'wait'; renderSeq(seq); }
      if (s.stop) { seq[2] = 'stopped'; seq[3] = 'stopped'; renderSeq(seq); }
      if (s.q) { answered.add(s.q); score = s.score; board.find((l) => l.id === 'john').score = score; }
      if (s.q || s.score) renderQual(answered, score);
      if (s.status) setStatus(...s.status);
      if (s.move) { moveLead('john', s.move); }
      else if (s.q) { const c = $('[data-lead="john"] .score'); if (c) { c.textContent = score; c.classList.toggle('hot', score >= 70); } }
      if (s.hot) {
        await run.wait(500);
        ldChat.sys('Sales team notified by SMS and email', 'i-flame');
        $('#ld-pill').innerHTML = `${icon('i-spark')}With sales team`;
        toast('Hot lead ready for sales', 'John Miller · New roof · Mississauga · Score 86', 'i-flame');
      }
      await run.wait(700);
    }
  }

  /* ================= CALLS ================= */
  const live = $('#live');
  $('#wave').innerHTML = Array.from({ length: 34 }, () => `<i style="--h:${(0.3 + Math.random() * 0.7).toFixed(2)};animation-delay:-${(Math.random()).toFixed(2)}s"></i>`).join('');
  const stateText = { idle: 'Waiting for calls', ringing: 'Incoming call…', talking: 'AI on the call', transfer: 'Transferring…', ended: 'Transferred to front desk' };
  let seconds = 0;
  function setCallState(st) { live.dataset.state = st; $('#live-state').textContent = stateText[st]; }
  function setSpeaking(who) {
    live.classList.toggle('speaking-ai', who === 'ai');
    live.classList.toggle('speaking-caller', who === 'caller');
    $('#speaker').innerHTML = who === 'ai' ? '<b>ELEVNSI AI</b> is speaking' : who === 'caller' ? '<b>Caller</b> is speaking' : '';
  }
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function renderFacts(filled = {}) {
    $('#facts').innerHTML = D.facts.map(([k, label]) => `<div><dt>${label}</dt><dd id="fact-${k}" class="${filled[k] ? '' : 'pending'}">${filled[k] || 'Listening…'}</dd></div>`).join('');
  }
  function fillFact(k, v) { const el = $(`#fact-${k}`); el.textContent = v; el.className = 'filled'; }
  function renderLog(includeDemo) {
    $('#call-log').innerHTML = D.callLog.slice(includeDemo ? 0 : 1).map((c, i) => `<tr${includeDemo && i === 0 ? ' style="animation:feedIn .6s ease both"' : ''}>
      <td class="num">${c.t}</td><td><b>${c.name}</b><span class="sub num">${c.num}</span></td><td>${c.reason}</td>
      <td><span class="pill ${c.out[0]}">${c.out[1]}</span></td><td class="num">${c.dur}</td><td>${c.by}</td></tr>`).join('');
  }
  function resetCalls() {
    setCallState('idle'); setSpeaking(null);
    seconds = 0; $('#live-timer').textContent = '00:00';
    $('#caller-av').textContent = '?';
    $('#caller-name').textContent = 'No active call';
    $('#caller-num').textContent = 'Line 1 · (905) 555-0142';
    $('#speaker').textContent = 'Press “Play demo call” to hear how the AI answers.';
    $('#transcript').innerHTML = `<div class="chat-start"><span class="sys-ic">${icon('i-headset', 'lg')}</span><b>Live transcript</b><span>Every word of the call appears here as it happens, then it’s saved with a summary.</span></div>`;
    const p = $('#tr-pill'); p.className = 'pill neutral'; p.textContent = 'Idle';
    renderFacts();
    const sm = $('#summary'); sm.className = 'summary-box'; sm.textContent = 'The AI writes a summary when the call ends.';
    renderLog(false);
  }
  function addLine(who, text, action) {
    const ai = who === 'ai';
    const tr = $('#transcript');
    const el = h(`<div class="tr ${ai ? 'ai' : ''}"><span class="tr-av">${ai ? 'AI' : (live.dataset.initials || 'C')}</span><div><span class="tr-name">${ai ? 'ELEVNSI AI · Ava' : (live.dataset.caller || 'Caller')}<small>${fmt(seconds)}</small></span><p></p></div></div>`);
    $('p', el).textContent = text;
    if (action) $('div', el).appendChild(h(`<span class="tr-action">${icon(ai ? 'i-zap' : 'i-check')}${action}</span>`));
    tr.appendChild(el);
    tr.scrollTop = tr.scrollHeight;
  }
  async function runCalls(run) {
    for (const s of D.callScript) {
      if (s.state === 'ringing') {
        setCallState('ringing');
        $('#caller-av').textContent = '?';
        $('#caller-name').textContent = '(647) 555-0198';
        $('#caller-num').textContent = 'Mississauga, ON · New caller';
        $('#speaker').textContent = 'Ringing… the AI picks up on the first ring.';
        $('#transcript').innerHTML = '';
        fillFact('phone', '(647) 555-0198 (caller ID)');
        await run.wait(s.wait);
        setCallState('talking');
        const p = $('#tr-pill'); p.className = 'pill onair'; p.innerHTML = '<span class="dot pulse"></span>Live';
        run.every(1000, () => { seconds += 1; $('#live-timer').textContent = fmt(seconds); });
        continue;
      }
      if (s.ai || s.caller) {
        const who = s.ai ? 'ai' : 'caller';
        const text = s.ai || s.caller;
        setSpeaking(who);
        await run.wait(Math.min(2600, 900 + text.length * 18));
        addLine(who, text, s.action);
        setSpeaking(null);
      }
      if (s.fact) {
        fillFact(...s.fact);
        if (s.fact[0] === 'name') {
          live.dataset.caller = 'Maria Lopez'; live.dataset.initials = 'ML';
          $('#caller-av').textContent = 'ML'; $('#caller-name').textContent = 'Maria Lopez';
        }
        if (s.fact[0] === 'booked') toast('Appointment booked by phone', 'Maria Lopez · Whitening · Fri 27 Nov, 3:00 PM', 'i-calendar');
      }
      if (s.fact2) fillFact(...s.fact2);
      if (s.state === 'transfer') { setCallState('transfer'); $('#speaker').innerHTML = 'Connecting to <b>Front desk · Aisha</b>…'; }
      if (s.end) {
        await run.wait(1800);
        run.timers.forEach((t) => clearInterval(t));
        setCallState('ended');
        $('#speaker').innerHTML = '<b>Aisha (front desk)</b> took over the call';
        const p = $('#tr-pill'); p.className = 'pill ok'; p.textContent = 'Saved';
        const sm = $('#summary'); sm.className = 'summary-box ready';
        sm.innerHTML = '<b>Maria Lopez</b> asked about teeth whitening ($299 in-office, $189 take-home). Booked in-office whitening for <b>Fri 27 Nov at 3:00 PM</b>; confirmation sent to her email. She had an insurance claim question, so the call was transferred to the front desk.';
        renderLog(true);
        toast('Call summary saved', 'Transcript and summary added to Recent calls', 'i-file');
      }
      await run.wait(450);
    }
  }

  /* ================= SETUP ================= */
  function renderSetup() {
    $('#hours').innerHTML = D.hours.map(([d, t], i) => `<div><span>${d}</span><label class="switch" title="Open on ${d}"><input type="checkbox" id="h-${i}" ${t !== 'Closed' ? 'checked' : ''} aria-label="Open on ${d}"><i></i></label><input class="input" id="ht-${i}" value="${t}" aria-label="${d} hours"></div>`).join('');
    $('#svc').innerHTML = D.services.map(([n, len, p, on], i) => `<tr><td><b>${n}</b></td><td class="num">${len}</td><td class="num">${p}</td><td><label class="switch"><input type="checkbox" id="svc-${i}" ${on ? 'checked' : ''} aria-label="AI can book ${n}"><i></i></label></td></tr>`).join('');
    $('#qlist').innerHTML = D.questions.map((q, i) => `<li><span class="grip">${icon('i-grip')}</span><span>${i + 1}. ${q}</span><button type="button" class="icon-btn" style="width:30px;height:30px" data-fake="Editing questions is part of the full product." aria-label="Remove question">${icon('i-x')}</button></li>`).join('');
    $('#toggles').innerHTML = D.toggles.map(([t, d, on], i) => `<label class="toggle-row" for="tg-${i}"><div><b>${t}</b><span>${d}</span></div><span class="switch"><input type="checkbox" id="tg-${i}" ${on ? 'checked' : ''}><i></i></span></label>`).join('');
  }
  $('#setup-form').addEventListener('submit', (e) => { e.preventDefault(); toast('Prototype', 'Settings look real but are not saved in this demo.', 'i-sliders'); });
  $$('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); $(`#${a.dataset.jump}`).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }));

  /* ================= INIT ================= */
  const SCRIPTS = { booking: runBooking, leads: runLeads, calls: runCalls };
  const RESETS = { booking: resetBooking, leads: resetLeads, calls: resetCalls };
  renderKpis('week');
  renderChart();
  renderFeed(false);
  resetBooking();
  resetLeads();
  resetCalls();
  renderSetup();

  /* shared helpers for advanced.js */
  window.ELV = {
    $, $$, h, icon, toast, chat, typeTime, play, resetView, isRunning, reduced,
    register(key, run, reset) { SCRIPTS[key] = run; RESETS[key] = reset; },
    onRoute(fn) { routeHooks.push(fn); },
    current: () => current,
    go(id) { if (location.hash.slice(1) === id) route(); else location.hash = id; },
    setClient(name) { $('#client-name').textContent = name; }
  };
  document.addEventListener('DOMContentLoaded', route);
})();
