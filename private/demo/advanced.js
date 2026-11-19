/* ELEVNSI Console prototype: advanced screens (inbox, analytics, workflows, AI training,
   integrations, agency clients, command palette). Sample data only; nothing is saved or sent. */
(() => {
  'use strict';
  const { $, $$, h, icon, toast, play, resetView, reduced } = window.ELV;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * (reduced ? 0.5 : 1)));
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ================= OVERVIEW: AI insights + live counter ================= */
  const INSIGHTS = [
    { icon: 'i-clock', html: '<b>34% of leads</b> arrived after 6 PM or on weekends. The AI answered every one of them in under 10 seconds.', btn: ['See when leads arrive', 'analytics'] },
    { icon: 'i-calendar', html: 'Tuesday 2–4 PM fills <b>3× faster</b> than other slots. A second hygienist at that time could add about 12 visits a month.', btn: ['Open calendar', 'booking'] },
    { icon: 'i-bulb', html: '<b>9 people</b> asked about payment plans and the AI had no answer. Add a financing note to the knowledge base.', btn: ['Fix in AI Training', 'training'] }
  ];
  $('#insights').innerHTML = INSIGHTS.map((i) => `<li><div class="in-top"><span class="feed-ic g">${icon(i.icon)}</span><p>${i.html}</p></div><a class="btn sm" href="#${i.btn[1]}">${i.btn[0]}${icon('i-arrow')}</a></li>`).join('');

  let live = 7;
  setInterval(() => { live = Math.max(4, Math.min(11, live + (rnd() > 0.5 ? 1 : -1))); $('#ai-now').textContent = live; }, 3200);

  /* ================= THEME ================= */
  const themeBtn = $('#theme-btn');
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const syncThemeIcon = () => { $('use', themeBtn).setAttribute('href', isDark() ? '#i-sun' : '#i-moon'); };
  function toggleTheme() { document.documentElement.dataset.theme = isDark() ? 'light' : 'dark'; syncThemeIcon(); }
  themeBtn.addEventListener('click', toggleTheme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeIcon);
  syncThemeIcon();

  /* ================= INBOX ================= */
  const CONVOS = [
    {
      id: 'daniel', name: 'Daniel Brooks', ini: 'DB', ch: 'Instagram', chIcon: 'i-insta', status: 'human', senti: 'neg', intent: 'Billing issue', time: '2m', unread: 2, auto: false,
      esc: '<b>Handed to you.</b> Billing disputes are outside the AI’s rules, so it stopped and asked for staff.',
      msgs: [
        { from: 'them', text: 'Hi, I was charged twice for my cleaning last week. This is really frustrating.' },
        { from: 'ai', text: 'I’m sorry about that, Daniel. I’ve flagged this for our billing team and someone will reply here shortly.' },
        { from: 'sys', text: 'Escalated to staff · billing dispute', icon: 'i-shield' },
        { from: 'them', text: 'Ok. I’d like the extra charge refunded please.' }
      ],
      sugg: ['Hi Daniel, I’m Aisha from ABC Dental billing. I can see the double charge and I’ve started the refund today.', 'Could you confirm the date of your visit so I can find the payment?', 'Sorry for the trouble. The refund will show on your statement in 3 to 5 business days.'],
      after: 'Thank you, that’s really helpful. Appreciate the quick reply!',
      profile: { contact: '@danbrooks · (647) 555-0133', since: 'Patient since 2023', value: '$1,240 lifetime', summary: 'Returning patient. Says he was charged twice for a cleaning on 12 Nov and wants a refund. Upset but polite.', intents: [['Billing issue', 92], ['Refund request', 74]], tags: ['Billing', 'Returning patient', 'Upset'], tl: [['i-insta', 'Messaged on Instagram', 'Today 10:51'], ['i-calendar', 'Cleaning visit', '12 Nov'], ['i-phone', 'Called about hours', '3 Oct']] }
    },
    {
      id: 'ahmed', name: 'Ahmed Raza', ini: 'AR', ch: 'SMS', chIcon: 'i-message', status: 'human', senti: 'neu', intent: 'Medical question', time: '9m', unread: 1, auto: false,
      esc: '<b>Handed to you.</b> The AI never gives medical advice and sent this to the dental team.',
      msgs: [
        { from: 'them', text: 'Is it normal for my gums to bleed after the deep cleaning yesterday?' },
        { from: 'ai', text: 'Thanks for asking, Ahmed. I can’t give medical advice, so I’ve asked Dr. Khan’s team to get back to you today. If the bleeding is heavy, please call (905) 555-0142.' },
        { from: 'sys', text: 'Escalated to Dr. Khan’s team · medical question', icon: 'i-shield' }
      ],
      sugg: ['Hi Ahmed, Dr. Khan here. Some light bleeding for a day or two is normal after a deep cleaning.', 'Rinse gently with warm salt water twice a day and use a soft brush.', 'If it doesn’t settle by Friday, reply here and we’ll book a quick check.'],
      after: 'Great, thank you doctor. I’ll do that.',
      profile: { contact: '(905) 555-0161', since: 'Patient since 2021', value: '$3,480 lifetime', summary: 'Had a deep cleaning yesterday. Asking whether gum bleeding is normal. Needs a reply from clinical staff.', intents: [['Medical question', 96], ['Aftercare', 81]], tags: ['Clinical', 'Aftercare'], tl: [['i-message', 'Texted the clinic', 'Today 10:44'], ['i-calendar', 'Deep cleaning', 'Yesterday'], ['i-bell', 'Reminder confirmed', '2 days ago']] }
    },
    {
      id: 'sarah', name: 'Sarah Ahmed', ini: 'SA', ch: 'WhatsApp', chIcon: 'i-message', status: 'ai', senti: 'pos', intent: 'Booking', time: '14m', unread: 0, auto: true,
      msgs: [
        { from: 'them', text: 'Hi, I want to book a teeth cleaning.' },
        { from: 'ai', text: 'Hi! I can book that for you. What day works best?' },
        { from: 'them', text: 'Tuesday or Wednesday next week' },
        { from: 'ai', text: 'We have Tuesday at 2 PM or Wednesday at 11 AM. Which one works for you?' },
        { from: 'them', text: 'Tuesday at 2 PM please' },
        { from: 'ai', text: 'You’re booked for Tuesday, 24 Nov at 2:00 PM. See you then!' },
        { from: 'sys', text: 'Booked · confirmation and reminders scheduled', icon: 'i-check' }
      ],
      profile: { contact: '(647) 555-0120 · sarah.a@example.com', since: 'New patient', value: 'Booked $140', summary: 'New patient. Booked a teeth cleaning for Tue 24 Nov at 2:00 PM. Reminders set for 24 h and 2 h before.', intents: [['Book cleaning', 98]], tags: ['New patient', 'Booked by AI'], tl: [['i-message', 'First WhatsApp message', 'Today 10:42'], ['i-calendar', 'Booked cleaning', 'Today 10:44']] }
    },
    {
      id: 'priya', name: 'Priya Nair', ini: 'PN', ch: 'Web chat', chIcon: 'i-globe', status: 'ai', senti: 'neu', intent: 'Price question', time: '31m', unread: 0, auto: true,
      msgs: [
        { from: 'them', text: 'How much is teeth whitening?' },
        { from: 'ai', text: 'In-office whitening is $299 and takes about an hour. Take-home kits are $189. Would you like to book a time?' },
        { from: 'them', text: 'Let me think about it' },
        { from: 'sys', text: 'No reply for 1 day · follow-up 1 sent', icon: 'i-clock' },
        { from: 'ai', text: 'Hi Priya, just checking in. We have whitening openings this Friday if you’d like one.' }
      ],
      profile: { contact: 'priya.n@example.com', since: 'Website visitor', value: 'Potential $299', summary: 'Asked about whitening prices. Hasn’t booked yet. In the follow-up sequence (1 of 3 sent).', intents: [['Whitening price', 95], ['Ready to book', 38]], tags: ['Follow-up 1 of 3', 'Whitening'], tl: [['i-globe', 'Chatted on website', 'Yesterday'], ['i-message', 'Follow-up sent', 'Today 9:00']] }
    },
    {
      id: 'omar', name: 'Omar Siddiqui', ini: 'OS', ch: 'WhatsApp', chIcon: 'i-message', status: 'closed', senti: 'pos', intent: 'Reminder reply', time: '1h', unread: 0, auto: true,
      msgs: [
        { from: 'ai', text: 'Hi Omar, a reminder about your check-up tomorrow at 9:00 AM with Dr. Khan. Reply YES to confirm or tell me a better time.' },
        { from: 'them', text: 'YES, I’ll be there!' },
        { from: 'ai', text: 'Perfect, see you tomorrow. Please arrive 10 minutes early.' },
        { from: 'sys', text: 'Appointment confirmed', icon: 'i-check' }
      ],
      profile: { contact: '(905) 555-0177', since: 'Patient since 2019', value: '$5,920 lifetime', summary: 'Confirmed tomorrow’s 9:00 AM check-up after the 24 h reminder.', intents: [['Confirm appointment', 99]], tags: ['Confirmed'], tl: [['i-bell', 'Reminder sent', 'Today 9:00'], ['i-check', 'Confirmed', 'Today 9:03']] }
    },
    {
      id: 'lina', name: 'Lina Park', ini: 'LP', ch: 'Email', chIcon: 'i-mail', status: 'closed', senti: 'pos', intent: 'Reschedule', time: '2h', unread: 0, auto: true,
      msgs: [
        { from: 'them', text: 'Hi, can I move my Wednesday check-up to later in the week?' },
        { from: 'ai', text: 'Of course, Lina. I can offer Thursday at 3:00 PM or Friday at 10:30 AM.' },
        { from: 'them', text: 'Thursday 3 PM works.' },
        { from: 'ai', text: 'Done! Your check-up is now Thursday, 26 Nov at 3:00 PM. The old time is freed up.' },
        { from: 'sys', text: 'Rescheduled · calendar updated', icon: 'i-refresh' }
      ],
      profile: { contact: 'lina.park@example.com', since: 'Patient since 2022', value: '$860 lifetime', summary: 'Moved her check-up from Wed 9:00 AM to Thu 3:00 PM by email.', intents: [['Reschedule', 97]], tags: ['Rescheduled by AI'], tl: [['i-mail', 'Email received', 'Today 8:40'], ['i-refresh', 'Rescheduled', 'Today 8:41']] }
    },
    {
      id: 'caller', name: '(416) 555-0110', ini: '?', ch: 'Phone call', chIcon: 'i-phone', status: 'closed', senti: 'neu', intent: 'Opening hours', time: '3h', unread: 0, auto: true,
      msgs: [
        { from: 'sys', text: 'Phone call · 0:48 · transcript', icon: 'i-phone' },
        { from: 'them', text: 'Hi, are you open on Saturday?' },
        { from: 'ai', text: 'Yes, we’re open Saturday from 10 AM to 2 PM. Would you like me to book a visit?' },
        { from: 'them', text: 'No thanks, just checking.' },
        { from: 'sys', text: 'Answered by AI · summary saved', icon: 'i-file' }
      ],
      profile: { contact: '(416) 555-0110', since: 'Unknown caller', value: '-', summary: 'Asked about Saturday hours. Answered by the AI. No booking needed.', intents: [['Opening hours', 99]], tags: ['Phone', 'Answered'], tl: [['i-phone', 'Call answered by AI', 'Today 7:58']] }
    }
  ];
  let ibFilter = 'all';
  let ibCurrent = 'daniel';
  const sentiLabel = { pos: 'Positive', neu: 'Neutral', neg: 'Upset' };
  const statusPill = { human: ['warn', 'Needs you'], ai: ['brand', 'AI handling'], closed: ['neutral', 'Closed'] };
  const convo = (id) => CONVOS.find((c) => c.id === id);

  function renderConvos() {
    const list = CONVOS.filter((c) => ibFilter === 'all' || c.status === ibFilter);
    $('#ib-convos').innerHTML = list.map((c) => `<li><button type="button" data-convo="${c.id}" aria-current="${c.id === ibCurrent}">
      <span class="ib-av">${esc(c.ini)}<span class="chan">${icon(c.chIcon)}</span></span>
      <span class="ib-c-main"><b>${esc(c.name)}</b><span>${esc(lastText(c))}</span><span class="tags"><span class="pill ${statusPill[c.status][0]}">${statusPill[c.status][1]}</span><span class="pill neutral">${esc(c.intent)}</span></span></span>
      <span class="ib-c-side"><span>${c.time}</span>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}<span class="senti ${c.senti}" title="${sentiLabel[c.senti]}"></span></span>
    </button></li>`).join('') || '<li class="empty">Nothing here right now.</li>';
    const needs = CONVOS.filter((c) => c.status === 'human').length;
    const badge = $('#nav-inbox-count');
    badge.textContent = needs; badge.hidden = !needs;
  }
  const lastText = (c) => { const m = [...c.msgs].reverse().find((x) => x.from !== 'sys'); return m ? m.text : ''; };

  function msgNode(m) {
    if (m.from === 'sys') return h(`<div class="sysmsg">${icon(m.icon || 'i-check')}<span>${esc(m.text)}</span></div>`);
    if (m.from === 'ai') return h(`<div class="msg ai"><span class="who">${icon('i-spark')}ELEVNSI AI</span>${esc(m.text)}</div>`);
    if (m.from === 'staff') return h(`<div class="msg staff"><span class="who">You · Front desk</span>${esc(m.text)}</div>`);
    return h(`<div class="msg them">${esc(m.text)}</div>`);
  }
  function renderThread() {
    const c = convo(ibCurrent);
    $('#ib-av').textContent = c.ini;
    $('#ib-name').textContent = c.name;
    $('#ib-ch').innerHTML = `${icon(c.chIcon)}${esc(c.ch)} · <span class="senti ${c.senti}"></span>${sentiLabel[c.senti]}`;
    $('#ib-auto').checked = c.auto;
    const escEl = $('#ib-esc');
    escEl.hidden = !(c.esc && c.status === 'human');
    if (c.esc) escEl.innerHTML = `${icon('i-shield')}<span>${c.esc}</span>`;
    const box = $('#ib-msgs');
    box.innerHTML = '';
    c.msgs.forEach((m) => box.appendChild(msgNode(m)));
    box.scrollTop = box.scrollHeight;
    const sug = $('#ib-suggest');
    sug.innerHTML = !c.auto && c.sugg ? `<span class="lbl">${icon('i-spark')}Suggested replies, written by the AI for you</span>` + c.sugg.map((s, i) => `<button type="button" class="sugg" data-sugg="${i}">${esc(s)}</button>`).join('') : '';
    const form = $('#ib-form'), ta = $('#ib-text');
    form.classList.toggle('locked', c.auto);
    ta.disabled = c.auto; $('#ib-send').disabled = c.auto;
    ta.placeholder = c.auto ? 'AI autopilot is on. Turn it off to reply yourself.' : `Reply to ${c.name.split(' ')[0]}…`;
    renderProfile(c);
  }
  function renderProfile(c) {
    const p = c.profile;
    $('#ib-profile').innerHTML = `
      <div class="pf-top"><span class="avatar">${esc(c.ini)}</span><b>${esc(c.name)}</b><span>${esc(p.contact)}</span><span class="pill ${statusPill[c.status][0]}">${statusPill[c.status][1]}</span></div>
      <div class="pf-sec"><h4>AI summary</h4><p class="pf-summary">${esc(p.summary)}</p></div>
      <div class="pf-sec"><h4>Detected intent</h4><div class="conf">${p.intents.map(([n, v]) => `<div><span>${esc(n)}</span><span class="num">${v}%</span><span class="bar"><i style="width:${v}%"></i></span></div>`).join('')}</div></div>
      <div class="pf-sec"><h4>Customer</h4><dl class="facts"><div><dt>Status</dt><dd>${esc(p.since)}</dd></div><div><dt>Value</dt><dd class="num">${esc(p.value)}</dd></div><div><dt>Mood</dt><dd><span class="senti ${c.senti}"></span> ${sentiLabel[c.senti]}</dd></div></dl></div>
      <div class="pf-sec"><h4>Tags</h4><div class="chips">${p.tags.map((t) => `<span class="pill neutral">${esc(t)}</span>`).join('')}</div></div>
      <div class="pf-sec"><h4>Timeline</h4><ul class="mini-tl">${p.tl.map(([ic, t, w]) => `<li><span class="ci">${icon(ic)}</span><div>${esc(t)}<small>${esc(w)}</small></div></li>`).join('')}</ul></div>`;
  }
  function selectConvo(id) {
    ibCurrent = id;
    const c = convo(id); c.unread = 0;
    renderConvos(); renderThread();
  }
  $('#ib-convos').addEventListener('click', (e) => { const b = e.target.closest('[data-convo]'); if (b) selectConvo(b.dataset.convo); });
  $('#ib-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    ibFilter = b.dataset.f;
    $$('#ib-filter button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderConvos();
  });
  $('#ib-auto').addEventListener('change', (e) => {
    const c = convo(ibCurrent);
    c.auto = e.target.checked;
    c.msgs.push({ from: 'sys', text: c.auto ? 'You handed the conversation back to the AI' : 'You took over from the AI', icon: c.auto ? 'i-spark' : 'i-user' });
    if (c.status !== 'closed') c.status = c.auto ? 'ai' : 'human';
    renderConvos(); renderThread();
    toast(c.auto ? 'AI autopilot on' : 'You’re in control', c.auto ? `The AI will keep talking to ${c.name}.` : 'The AI paused and is suggesting replies for you.', c.auto ? 'i-spark' : 'i-user');
  });
  $('#ib-suggest').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sugg]'); if (!b) return;
    const ta = $('#ib-text'); ta.value = convo(ibCurrent).sugg[+b.dataset.sugg]; ta.focus();
  });
  $('#ib-text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ib-form').requestSubmit(); } });
  $('#ib-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = $('#ib-text'); const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    const c = convo(ibCurrent);
    c.msgs.push({ from: 'staff', text }); ta.value = '';
    renderThread(); renderConvos();
    toast('Reply added', 'Prototype: nothing was actually sent.', 'i-send');
    if (c.after) {
      const reply = c.after; c.after = null;
      await sleep(2200);
      c.msgs.push({ from: 'them', text: reply }); c.senti = 'pos';
      if (ibCurrent === c.id) renderThread();
      renderConvos();
    }
  });
  renderConvos(); renderThread();

  /* ================= ANALYTICS ================= */
  const FUNNEL = [['New leads', 196], ['Talked with AI', 181], ['Qualified', 124], ['Booked', 86], ['Showed up', 79]];
  $('#funnel').innerHTML = FUNNEL.map(([n, v], i) => `<div class="fn-row"><span>${n}</span><span class="fn-bar"><i data-w="${(v / FUNNEL[0][1]) * 100}" class="num">${v}</i></span><span class="rate num">${i ? Math.round((v / FUNNEL[i - 1][1]) * 100) + '%' : ''}</span></div>`).join('');
  function animateFunnel() {
    const bars = $$('#funnel i');
    bars.forEach((b) => { b.style.transition = 'none'; b.style.width = '0'; });
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b, i) => { b.style.transition = ''; b.style.transitionDelay = `${i * 90}ms`; b.style.width = `${b.dataset.w}%`; })));
  }
  const HOURS_SAVED = Math.round((1284 * 4 + 512 * 3.5) / 60);
  function roi() {
    const val = +$('#roi-value').value, rate = +$('#roi-rate').value;
    const rev = FUNNEL[4][1] * val, time = HOURS_SAVED * rate;
    $('#roi-value-out').textContent = money(val);
    $('#roi-rate-out').textContent = money(rate);
    $('#roi-rev').textContent = money(rev);
    $('#roi-time').textContent = `${HOURS_SAVED} h · ${money(time)}`;
    $('#roi-total').textContent = money(rev + time);
  }
  $('#roi-value').addEventListener('input', roi);
  $('#roi-rate').addEventListener('input', roi);
  roi();

  (function resolutionChart() {
    const vals = []; let v = 78;
    for (let i = 0; i < 30; i++) { v = Math.min(94, Math.max(74, v + (rnd() - 0.35) * 2.2)); vals.push(v); }
    vals[29] = 91;
    const W = 560, H = 210, L = 34, R = 40, T = 14, B = 26, min = 70, max = 100;
    const x = (i) => L + (i / 29) * (W - L - R), y = (n) => T + (1 - (n - min) / (max - min)) * (H - T - B);
    let s = '';
    for (let g = 70; g <= 100; g += 10) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text x="${L - 8}" y="${y(g) + 4}" text-anchor="end">${g}%</text>`;
    [0, 7, 14, 21, 29].forEach((i) => { s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${i + 1} Nov</text>`; });
    const line = vals.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join(' ');
    s += `<path class="area" d="${line} L${x(29)} ${y(min)} L${x(0)} ${y(min)} Z"/><path class="line" d="${line}"/>`;
    s += `<circle class="endpt" cx="${x(29)}" cy="${y(91)}" r="5"/><text class="endlbl" x="${x(29) + 9}" y="${y(91) + 4}">91%</text>`;
    $('#res-chart').innerHTML = s;
  })();

  (function donut() {
    const parts = [['WhatsApp', 38, '#7cc400'], ['Website', 24, '#2f6bd8'], ['Phone calls', 22, '#e8a317'], ['Instagram', 10, '#c13584'], ['SMS', 6, '#8a938b']];
    const r = 60, c = 2 * Math.PI * r; let off = 0;
    const segs = parts.map(([n, p, col]) => { const len = (p / 100) * c; const seg = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${col}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 2.5)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${n}: ${p}%</title></circle>`; off += len; return seg; }).join('');
    $('#donut').innerHTML = `<svg viewBox="0 0 160 160" role="img" aria-label="Lead sources">${segs}<text class="total" x="80" y="82" text-anchor="middle">196</text><text class="tl" x="80" y="98" text-anchor="middle">leads</text></svg>
      <ul class="legend">${parts.map(([n, p, col]) => `<li><i style="background:${col}"></i><span>${n}</span><b class="num">${p}%</b></li>`).join('')}</ul>`;
  })();

  (function heatmap() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const blocks = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
    const shape = [0.05, 0.02, 0.02, 0.1, 0.45, 0.75, 0.7, 0.65, 0.6, 0.85, 0.9, 0.4];
    let s = '<span></span>' + blocks.map((b) => `<span class="hh">${b}</span>`).join('');
    let total = 0, after = 0;
    days.forEach((d, di) => {
      s += `<span class="hl">${d}</span>`;
      blocks.forEach((b, bi) => {
        const weekend = di >= 5 ? 0.8 : 1;
        const v = Math.min(1, Math.max(0.03, shape[bi] * weekend + (rnd() - 0.5) * 0.18));
        const isAfter = bi < 4 || bi >= 9 || di === 6;
        total += v; if (isAfter) after += v;
        s += `<span class="hc${isAfter ? ' after' : ''}" style="--v:${v.toFixed(2)}" title="${d} ${b}: ${Math.round(v * 14)} leads"></span>`;
      });
    });
    $('#heat').innerHTML = s;
    $('#heat-note').textContent = `${Math.round((after / total) * 100)}% arrive outside opening hours (dashed). The AI answers all of them.`;
  })();

  const INTENTS = [['Whitening price', 64, 98], ['Opening hours', 58, 100], ['Insurance accepted?', 47, 94], ['Book a cleaning', 45, 96], ['Reschedule or cancel', 31, 97], ['Tooth pain / urgent', 18, 0, 'Sent to staff by rule'], ['Payment plans', 9, 33, 'Knowledge gap']];
  $('#intents').innerHTML = INTENTS.map(([q, n, r, note]) => `<tr><td><b>${q}</b>${note ? `<span class="sub">${note}</span>` : ''}</td><td class="num">${n}</td><td>${note === 'Sent to staff by rule' ? '<span class="pill info">By design</span>' : `<div class="res-cell"><span class="bar"><i style="width:${r}%;${r < 60 ? 'background:var(--warn)' : ''}"></i></span><span class="num">${r}%</span></div>`}</td></tr>`).join('');

  /* ================= WORKFLOWS ================= */
  const WF = [
    {
      id: 'qualify', name: 'New lead qualification', desc: 'Runs on every new lead from WhatsApp, web forms and Instagram', runs: 412, rate: '64%', rateLbl: 'booked', on: true, rows: 6,
      nodes: [
        { id: 't', type: 'trigger', col: 1, row: 0, icon: 'i-zap', title: 'New lead arrives', sub: 'WhatsApp · Web form · Instagram', cfg: [['Channels', 'WhatsApp, web form, Instagram DM, Facebook Lead Ads'], ['First reply within', '5 seconds'], ['Runs', '24/7']] },
        { id: 'ai', type: 'ai', col: 1, row: 1, icon: 'i-spark', title: 'AI qualification chat', sub: 'Asks 4 questions', cfg: [['Questions', 'Treatment needed, new or returning patient, insurance, preferred day'], ['Tone', 'Friendly'], ['Language', 'Matches the lead']], prompt: 'You are the front desk assistant for ABC Dental. Be warm and brief. Ask one question at a time. Never give medical advice or quote prices that are not in the price list.' },
        { id: 'c1', type: 'cond', col: 1, row: 2, icon: 'i-branch', title: 'Lead score 70 or more?', sub: 'Scored by AI from the answers', cfg: [['Rule', 'Score is 70 or higher'], ['Score is based on', 'Treatment value, urgency, insurance, distance']] },
        { id: 'yes', type: 'action', col: 0, row: 3, icon: 'i-calendar', title: 'Book appointment', sub: 'Offers 2 open slots', cfg: [['Calendar', 'Google Calendar · Dr. Khan'], ['Slots offered', '2'], ['Confirmation', 'WhatsApp and email']] },
        { id: 'no', type: 'wait', col: 2, row: 3, icon: 'i-clock', title: 'Follow-up sequence', sub: 'Day 2, 5 and 9', cfg: [['Messages', '3'], ['Stops when', 'The lead replies or books'], ['Quiet hours', '9 PM – 8 AM']] },
        { id: 'alert', type: 'action', col: 0, row: 4, icon: 'i-bell', title: 'Notify front desk', sub: 'Slack and SMS', cfg: [['Send to', '#front-desk on Slack'], ['Only when', 'Treatment value over $500']] },
        { id: 'c2', type: 'cond', col: 2, row: 4, icon: 'i-branch', title: 'Lead replied?', sub: 'Checked after each message', cfg: [['If yes', 'Back to the AI chat'], ['If no after day 9', 'Move to nurture list']] },
        { id: 'crm', type: 'end', col: 0, row: 5, icon: 'i-refresh', title: 'Sync to CRM', sub: 'HubSpot contact and deal', cfg: [['CRM', 'HubSpot'], ['Fields', 'Name, phone, email, answers, score, source']] },
        { id: 'nur', type: 'end', col: 2, row: 5, icon: 'i-mail', title: 'Monthly nurture list', sub: 'Tips and offers by email', cfg: [['Sends', 'Once a month'], ['Unsubscribe', 'Honoured instantly']] }
      ],
      edges: [['t', 'ai'], ['ai', 'c1'], ['c1', 'yes', 'Yes'], ['c1', 'no', 'No'], ['yes', 'alert'], ['alert', 'crm'], ['no', 'c2'], ['c2', 'nur', 'No reply']],
      path: ['t', 'ai', 'c1', 'yes', 'alert', 'crm'],
      log: { t: 'New WhatsApp lead: Ayesha Malik', ai: 'AI asked 4 questions · 1 min 40 s', c1: 'Score 82 → took the Yes path', yes: 'Booked check-up · Wed 25 Nov, 11:00 AM', alert: 'Front desk notified on Slack', crm: 'HubSpot contact and deal created' }
    },
    {
      id: 'missed', name: 'Missed-call text back', desc: 'Texts callers within 30 seconds when a call is missed', runs: 96, rate: '58%', rateLbl: 'booked', on: true, rows: 6,
      nodes: [
        { id: 't', type: 'trigger', col: 1, row: 0, icon: 'i-phone', title: 'Missed call', sub: 'Line busy or after hours', cfg: [['Lines', 'Main line (905) 555-0142'], ['Counts as missed', 'Not answered in 4 rings']] },
        { id: 'w', type: 'wait', col: 1, row: 1, icon: 'i-clock', title: 'Wait 30 seconds', sub: 'In case they call back', cfg: [['Delay', '30 seconds']] },
        { id: 's', type: 'action', col: 1, row: 2, icon: 'i-message', title: 'Send SMS', sub: '“Sorry we missed your call…”', cfg: [['Message', 'Hi, this is ABC Dental. Sorry we missed your call! How can we help? You can book right here by text.']] },
        { id: 'ai', type: 'ai', col: 1, row: 3, icon: 'i-spark', title: 'AI chat by SMS', sub: 'Finds out what they need', cfg: [['Goal', 'Answer the question or book a visit']], prompt: 'Find out why they called. Answer from the knowledge base or offer to book.' },
        { id: 'c', type: 'cond', col: 1, row: 4, icon: 'i-branch', title: 'Wants to book?', sub: 'Detected by AI', cfg: [['Rule', 'Booking intent above 80%']] },
        { id: 'b', type: 'end', col: 0, row: 5, icon: 'i-calendar', title: 'Book appointment', sub: 'Added to calendar', cfg: [['Calendar', 'Google Calendar']] },
        { id: 'm', type: 'end', col: 2, row: 5, icon: 'i-mail', title: 'Take a message', sub: 'Emailed to front desk', cfg: [['Send to', 'frontdesk@abcdental.example']] }
      ],
      edges: [['t', 'w'], ['w', 's'], ['s', 'ai'], ['ai', 'c'], ['c', 'b', 'Yes'], ['c', 'm', 'No']],
      path: ['t', 'w', 's', 'ai', 'c', 'b'],
      log: { t: 'Missed call from (647) 555-0182', w: 'Waited 30 s · no call back', s: 'SMS sent', ai: 'Caller asked about a filling', c: 'Booking intent 91% → Yes', b: 'Booked filling · Thu 26 Nov, 12:00 PM' }
    },
    {
      id: 'noshow', name: 'No-show recovery', desc: 'Rebooks patients who miss their appointment', runs: 38, rate: '47%', rateLbl: 'rebooked', on: true, rows: 6,
      nodes: [
        { id: 't', type: 'trigger', col: 1, row: 0, icon: 'i-calendar', title: 'Marked as no-show', sub: 'From the calendar', cfg: [['Source', 'Google Calendar status']] },
        { id: 'w', type: 'wait', col: 1, row: 1, icon: 'i-clock', title: 'Wait 1 hour', sub: 'Gives them time to call', cfg: [['Delay', '1 hour']] },
        { id: 's', type: 'action', col: 1, row: 2, icon: 'i-message', title: 'WhatsApp check-in', sub: '“We missed you today…”', cfg: [['Message', 'Hi! We missed you today. No problem, would you like to pick a new time?']] },
        { id: 'c', type: 'cond', col: 1, row: 3, icon: 'i-branch', title: 'Replied?', sub: 'Within 3 days', cfg: [['Window', '3 days']] },
        { id: 'o', type: 'ai', col: 0, row: 4, icon: 'i-spark', title: 'Offer new times', sub: 'AI picks 2 slots', cfg: [['Slots', 'Next 7 days']], prompt: 'Offer two times in the next week that match their original time of day.' },
        { id: 'd', type: 'wait', col: 2, row: 4, icon: 'i-clock', title: 'Reminder on day 3', sub: 'One more nudge', cfg: [['Delay', '3 days']] },
        { id: 'r', type: 'end', col: 0, row: 5, icon: 'i-check', title: 'Rebooked', sub: 'Confirmation sent', cfg: [['Confirmation', 'WhatsApp and email']] },
        { id: 'e', type: 'end', col: 2, row: 5, icon: 'i-user', title: 'Flag for staff call', sub: 'Added to call list', cfg: [['List', 'Front desk call list']] }
      ],
      edges: [['t', 'w'], ['w', 's'], ['s', 'c'], ['c', 'o', 'Yes'], ['c', 'd', 'No'], ['o', 'r'], ['d', 'e']],
      path: ['t', 'w', 's', 'c', 'o', 'r'],
      log: { t: 'Kevin Wright missed Fri 10:00 AM', w: 'Waited 1 hour', s: 'WhatsApp check-in sent', c: 'Kevin replied after 20 min → Yes', o: 'Offered Mon 10:00 AM or Tue 11:00 AM', r: 'Rebooked for Mon 30 Nov, 10:00 AM' }
    },
    {
      id: 'review', name: 'Review request', desc: 'Asks happy patients for a Google review', runs: 141, rate: '41%', rateLbl: 'reviewed', on: false, rows: 6,
      nodes: [
        { id: 't', type: 'trigger', col: 1, row: 0, icon: 'i-check', title: 'Visit completed', sub: 'Checked out at front desk', cfg: [['Source', 'Calendar event ended']] },
        { id: 'w', type: 'wait', col: 1, row: 1, icon: 'i-clock', title: 'Wait 2 hours', sub: 'After they get home', cfg: [['Delay', '2 hours']] },
        { id: 'a', type: 'ai', col: 1, row: 2, icon: 'i-spark', title: 'Ask for a 1–5 rating', sub: 'By SMS', cfg: [['Question', 'How was your visit today, from 1 to 5?']], prompt: 'Thank them for visiting and ask for a rating from 1 to 5.' },
        { id: 'c', type: 'cond', col: 1, row: 3, icon: 'i-branch', title: 'Rated 4 or 5?', sub: 'Happy patient', cfg: [['Rule', 'Rating is 4 or 5']] },
        { id: 'g', type: 'action', col: 0, row: 4, icon: 'i-star', title: 'Send Google review link', sub: 'One tap to review', cfg: [['Link', 'Google Business profile']] },
        { id: 'm', type: 'action', col: 2, row: 4, icon: 'i-bell', title: 'Alert practice manager', sub: 'Private feedback', cfg: [['Send to', 'Practice manager by SMS']] },
        { id: 'ge', type: 'end', col: 0, row: 5, icon: 'i-message', title: 'Thank-you message', sub: 'After they review', cfg: [] },
        { id: 'me', type: 'end', col: 2, row: 5, icon: 'i-phone', title: 'Manager calls back', sub: 'Same day', cfg: [] }
      ],
      edges: [['t', 'w'], ['w', 'a'], ['a', 'c'], ['c', 'g', 'Yes'], ['c', 'm', 'No'], ['g', 'ge'], ['m', 'me']],
      path: ['t', 'w', 'a', 'c', 'g', 'ge'],
      log: { t: 'Sarah Ahmed checked out', w: 'Waited 2 hours', a: 'Sarah rated her visit 5', c: 'Rating 5 → Yes', g: 'Google review link sent', ge: 'Thank-you sent after her review' }
    }
  ];
  const typeName = { trigger: 'Trigger', ai: 'AI step', cond: 'Condition', action: 'Action', wait: 'Wait', end: 'Final step' };
  const COLX = [130, 380, 630], NODE_W = 220, NODE_H = 64, ROW_H = 106, TOP = 28;
  let wfCurrent = WF[0];
  let wfNode = null;

  function renderWfList() {
    $('#wf-count').textContent = `${WF.filter((w) => w.on).length} of ${WF.length} live`;
    $('#wf-list').innerHTML = WF.map((w) => `<li><div role="button" tabindex="0" data-wf="${w.id}" aria-current="${w === wfCurrent}">
      <b>${w.name}</b><label class="switch" title="Turn on or off"><input type="checkbox" data-wf-toggle="${w.id}" ${w.on ? 'checked' : ''} aria-label="${w.name} on or off"><i></i></label>
      <small>${w.desc}</small>
      <span class="wf-stats"><span><b class="num">${w.runs}</b> runs</span><span><b class="num">${w.rate}</b> ${w.rateLbl}</span></span>
    </div></li>`).join('');
  }
  function renderCanvas() {
    const w = wfCurrent;
    $('#wf-name').textContent = w.name;
    $('#wf-desc').textContent = w.desc;
    const st = $('#wf-state'); st.className = `pill ${w.on ? 'ok' : 'neutral'}`; st.textContent = w.on ? 'Live' : 'Paused';
    const H = TOP + w.rows * ROW_H;
    const pos = Object.fromEntries(w.nodes.map((n) => [n.id, { x: COLX[n.col], y: TOP + n.row * ROW_H }]));
    let svg = `<svg viewBox="0 0 760 ${H}" aria-hidden="true">`;
    let labels = '';
    w.edges.forEach(([a, b, lbl]) => {
      const p = pos[a], q = pos[b];
      const x1 = p.x, y1 = p.y + NODE_H, x2 = q.x, y2 = q.y, my = (y1 + y2) / 2;
      svg += `<path class="wf-edge" id="e-${a}-${b}" d="M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}"/>`;
      if (lbl) labels += `<span class="wf-elabel" style="left:${(x1 + x2) / 2}px;top:${my}px">${lbl}</span>`;
    });
    svg += '</svg>';
    const nodes = w.nodes.map((n) => `<button type="button" class="wf-node" data-node="${n.id}" data-type="${n.type}" style="left:${pos[n.id].x - NODE_W / 2}px;top:${pos[n.id].y}px" aria-pressed="false">
      <span class="ni">${icon(n.icon)}</span><span><b>${n.title}</b><span>${n.sub}</span></span></button>`).join('');
    const cv = $('#wf-canvas');
    cv.style.height = `${H}px`;
    cv.innerHTML = svg + labels + nodes;
    selectNode(w.nodes[0].id);
  }
  function selectNode(id) {
    const n = wfCurrent.nodes.find((x) => x.id === id);
    wfNode = n;
    $$('.wf-node').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.node === id)));
    $('#wf-node-type').textContent = typeName[n.type];
    $('#wf-inspect').innerHTML = `<div class="insp">
      <div class="insp-title"><span class="feed-ic${n.type === 'ai' ? ' g' : ''}">${icon(n.icon)}</span><b>${n.title}</b></div>
      ${n.cfg.map(([k, v], i) => `<div class="field"><label for="cfg-${i}">${k}</label><input class="input" id="cfg-${i}" value="${esc(v)}"></div>`).join('')}
      ${n.prompt ? `<div class="field"><label for="cfg-prompt">Instructions for the AI</label><textarea class="input" id="cfg-prompt" rows="4">${esc(n.prompt)}</textarea></div>` : ''}
      <button class="btn sm" type="button" data-fake="Editing steps is part of the full product.">Save step</button>
    </div>`;
  }
  function resetWf() {
    $$('.wf-node').forEach((n) => n.classList.remove('active', 'done'));
    $$('.wf-edge').forEach((e) => e.classList.remove('flow', 'done'));
    $('#wf-log').innerHTML = '<li><time>--:--</time><span style="color:var(--faint)">Press Test run to send a sample lead through this workflow.</span></li>';
    const p = $('#wf-run-pill'); p.className = 'pill neutral'; p.textContent = 'Ready';
  }
  async function runWf(run) {
    const w = wfCurrent;
    $('#wf-log').innerHTML = '';
    const p = $('#wf-run-pill'); p.className = 'pill onair'; p.innerHTML = '<span class="dot pulse"></span>Running';
    let t = 0;
    const log = (text, ok) => {
      const li = h(`<li class="${ok ? 'ok' : ''}"><time>00:${String(t).padStart(2, '0')}</time><span></span></li>`);
      $('span', li).textContent = text; const lg = $('#wf-log'); lg.appendChild(li); lg.scrollTop = lg.scrollHeight;
    };
    for (let i = 0; i < w.path.length; i++) {
      const id = w.path[i];
      const node = $(`.wf-node[data-node="${id}"]`);
      node.classList.add('active');
      selectNode(id);
      await run.wait(850);
      t += Math.ceil(rnd() * 9) + 1;
      log(w.log[id]);
      node.classList.remove('active'); node.classList.add('done');
      const next = w.path[i + 1];
      if (next) {
        const e = $(`#e-${id}-${next}`);
        e.classList.add('flow');
        await run.wait(550);
        e.classList.remove('flow'); e.classList.add('done');
      }
    }
    log('Test run finished · no real messages were sent', true);
    p.className = 'pill ok'; p.textContent = 'Passed';
    toast('Test run passed', `${w.name}: ${w.path.length} steps in ${t} seconds`, 'i-branch');
  }
  window.ELV.register('workflows', runWf, resetWf);
  $('#wf-list').addEventListener('click', (e) => {
    const tg = e.target.closest('[data-wf-toggle]');
    if (tg) {
      const w = WF.find((x) => x.id === tg.dataset.wfToggle); w.on = tg.checked;
      toast(w.on ? 'Workflow turned on' : 'Workflow paused', `${w.name} (prototype)`, 'i-branch');
      renderWfList(); if (w === wfCurrent) renderCanvas(); resetWf();
      return;
    }
    if (e.target.closest('.switch')) return;
    const item = e.target.closest('[data-wf]'); if (!item) return;
    resetView('workflows');
    wfCurrent = WF.find((x) => x.id === item.dataset.wf);
    renderWfList(); renderCanvas(); resetWf();
  });
  $('#wf-list').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-wf]')) { e.preventDefault(); e.target.click(); } });
  $('#wf-canvas').addEventListener('click', (e) => { const n = e.target.closest('[data-node]'); if (n) selectNode(n.dataset.node); });
  renderWfList(); renderCanvas(); resetWf();

  /* ================= AI TRAINING ================= */
  const SOURCES = [
    ['i-file', 'Price list 2026.pdf', 'PDF · 3 pages · 48 answers'],
    ['i-file', 'FAQ.docx', 'Word · 22 questions'],
    ['i-globe', 'abcdental.example', 'Website · 12 pages · synced daily'],
    ['i-file', 'Insurance and billing policy.pdf', 'PDF · 5 pages'],
    ['i-pin', 'Google Business profile', 'Hours, address, services']
  ];
  $('#sources').innerHTML = SOURCES.map(([ic, n, m]) => `<li><span class="ci">${icon(ic)}</span><div><b>${esc(n)}</b><small>${m}</small></div><span class="pill ok">Trained</span></li>`).join('');
  function addSource(name) {
    const li = h(`<li><span class="ci">${icon('i-file')}</span><div><b></b><small>Reading file…</small><span class="bar"><i style="width:0%"></i></span></div><span class="pill info">Training</span></li>`);
    $('b', li).textContent = name;
    $('#sources').prepend(li);
    const steps = ['Reading file…', 'Splitting into answers…', 'Checking against guardrails…'];
    let pct = 0;
    const timer = setInterval(() => {
      pct += 9 + rnd() * 8;
      const bar = $('.bar i', li);
      if (pct >= 100) {
        clearInterval(timer);
        $('.bar', li).remove();
        const n = 8 + Math.floor(rnd() * 30);
        $('small', li).textContent = `Added just now · ${n} answers learned`;
        const p = $('.pill', li); p.className = 'pill ok'; p.textContent = 'Trained';
        toast('Knowledge added', `The AI learned ${n} new answers from ${name}.`, 'i-brain');
        return;
      }
      bar.style.width = `${pct}%`;
      $('small', li).textContent = steps[Math.min(2, Math.floor(pct / 34))];
    }, 300);
  }
  const drop = $('#drop');
  $('#drop-input').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) addSource(f.name); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer?.files?.[0]; if (f) addSource(f.name); });

  const GUARDS = [
    ['Only quote prices from the price list', 'Never guesses a price', true],
    ['Hand off when unsure', 'Below 70% confidence goes to staff', true],
    ['No medical advice', 'Symptoms go to the dental team right away', true],
    ['Hand off upset customers', 'Calms them, then brings in staff', true],
    ['Respect opt-outs', 'Replying STOP ends all messages', true],
    ['Quiet hours for follow-ups', 'No messages 9 PM – 8 AM', true]
  ];
  $('#guards').innerHTML = GUARDS.map(([t, d, on], i) => `<label class="toggle-row" for="gd-${i}"><div><b>${t}</b><span>${d}</span></div><span class="switch"><input type="checkbox" id="gd-${i}" ${on ? 'checked' : ''}><i></i></span></label>`).join('');
  $('#guards').addEventListener('change', (e) => { if (e.target.checked === false) toast('Guardrail off', 'In the full product this asks for a manager’s approval first.', 'i-shield'); });

  const KB = [
    { k: ['pain', 'hurt', 'bleed', 'swollen', 'emergency', 'ache'], a: 'I’m sorry you’re in pain. I can’t give medical advice, so I’m connecting you with our dental team now. For severe pain, call (905) 555-0142.', src: 'Guardrail · no medical advice', c: 100, esc: true },
    { k: ['whiten', 'bleach'], a: 'In-office whitening is $299 and takes about an hour. Take-home kits are $189. Would you like to book?', src: 'Price list 2026.pdf · page 2', c: 97 },
    { k: ['hour', 'open', 'close', 'saturday', 'sunday', 'weekend'], a: 'We’re open Mon–Wed and Fri 9 AM–5 PM, Thursday until 7 PM, and Saturday 10 AM–2 PM. We’re closed on Sunday.', src: 'Google Business profile', c: 99 },
    { k: ['insurance', 'coverage', 'direct bill', 'claim'], a: 'We accept most major insurance plans and bill them directly, so you only pay your share.', src: 'Insurance and billing policy.pdf', c: 94 },
    { k: ['book', 'appointment', 'available', 'slot', 'schedule'], a: 'I can book that for you. The next openings are Tuesday at 2:00 PM or Wednesday at 11:00 AM. Which works better?', src: 'Live calendar · Dr. Khan', c: 98, action: 'Checked calendar' },
    { k: ['where', 'address', 'location', 'parking', 'directions'], a: 'We’re at 2150 Hurontario St, Mississauga. There’s free parking behind the building.', src: 'abcdental.example · Contact page', c: 96 },
    { k: ['cancel', 'reschedule', 'move my'], a: 'You can cancel or move your visit for free up to 24 hours before. Want me to find a new time?', src: 'FAQ.docx · Policies', c: 95 },
    { k: ['clean', 'check-up', 'checkup', 'x-ray', 'price', 'cost', 'how much'], a: 'A cleaning is $140 and a check-up with X-rays is $95.', src: 'Price list 2026.pdf · page 1', c: 92 }
  ];
  const pgChat = $('#pg-chat');
  function pgAdd(node) { pgChat.appendChild(node); pgChat.scrollTop = pgChat.scrollHeight; }
  function pgAi(text, meta) {
    const m = h(`<div class="msg ai"><span class="who">${icon('i-spark')}ELEVNSI AI</span><span class="t"></span><div class="msg-meta">${meta}</div></div>`);
    $('.t', m).textContent = text; pgAdd(m);
  }
  pgAi('Hi! I’m the ABC Dental assistant. Ask me anything a patient might ask. I only answer from your knowledge base.', '<span class="hi">Ready</span><span>5 sources</span>');
  const CHIPS = ['How much is whitening?', 'Are you open Saturday?', 'Do you take insurance?', 'Book me a cleaning', 'My tooth really hurts', 'Do you offer payment plans?'];
  $('#pg-chips').innerHTML = CHIPS.map((c) => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('');
  $('#pg-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
  $('#pg-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#pg-input').value.trim(); if (v) { $('#pg-input').value = ''; ask(v); } });
  let asking = false;
  async function ask(q) {
    if (asking) return; asking = true;
    const m = h('<div class="msg them"></div>'); m.textContent = q; pgAdd(m);
    const typing = h('<div class="typing right" aria-hidden="true"><i></i><i></i><i></i></div>'); pgAdd(typing);
    await sleep(900 + rnd() * 600);
    typing.remove();
    const ql = q.toLowerCase();
    let best = null, bestScore = 0;
    KB.forEach((e) => { const s = e.k.filter((k) => ql.includes(k)).length; if (s > bestScore) { best = e; bestScore = s; } });
    if (best) {
      const meta = `<span class="hi">${icon('i-shield')}Confidence ${best.c}%</span><span>${icon('i-file')}${esc(best.src)}</span>${best.action ? `<span>${icon('i-zap')}${best.action}</span>` : ''}${best.esc ? `<span class="lo">${icon('i-user')}Handed to staff</span>` : ''}`;
      pgAi(best.a, meta);
    } else {
      pgAi('I don’t have that information yet, so I’ve passed your question to the team. Someone will reply shortly.', `<span class="lo">${icon('i-shield')}Confidence 41%</span><span class="lo">${icon('i-user')}Below 70% · handed to staff</span>`);
      addReview(q, 'No answer in the knowledge base yet.', ['warn', 'Knowledge gap']);
    }
    asking = false;
  }
  const REVIEWS = [
    ['Do you do Invisalign for teenagers?', 'We offer Invisalign. I wasn’t sure about age limits, so I asked the team.', ['warn', 'Confidence 58%']],
    ['Can I bring my dog to my appointment?', 'I didn’t know the pet policy, so I passed this to the team.', ['warn', 'Knowledge gap']],
    ['Is parking free on weekends?', 'Yes, parking behind the building is free every day.', ['info', 'New answer to approve']]
  ];
  function addReview(q, a, flag) {
    const li = h(`<li><span class="q"></span><span class="a"></span><div class="rv-foot"><span class="pill ${flag[0]}">${flag[1]}</span><button class="btn sm" type="button" data-fake="Writing the correct answer is part of the full product.">Edit answer</button><button class="btn sm primary" type="button" data-approve>Approve</button></div></li>`);
    $('.q', li).textContent = `“${q}”`; $('.a', li).textContent = a;
    $('#reviews').prepend(li); countReviews();
  }
  function countReviews() { const n = $$('#reviews li').length; $('#rev-count').textContent = n; $('#rev-count').className = `pill ${n ? 'warn' : 'ok'}`; if (!n) $('#reviews').innerHTML = '<li class="empty" style="border:0;background:none">All caught up. The AI will flag anything it isn’t sure about.</li>'; }
  [...REVIEWS].reverse().forEach((r) => addReview(...r));
  $('#reviews').addEventListener('click', (e) => {
    const b = e.target.closest('[data-approve]'); if (!b) return;
    b.closest('li').remove(); countReviews();
    toast('Answer approved', 'The AI will use this answer from now on.', 'i-check');
  });

  /* ================= INTEGRATIONS ================= */
  const INTS = [
    ['Google Calendar', 'Calendars', 'GC', '#2f6bd8', true, 'Reads free slots and adds bookings in real time.', 'Synced 1 min ago'],
    ['Microsoft Outlook', 'Calendars', 'OL', '#0f5fb8', false, 'Use Outlook calendars for staff schedules.'],
    ['Calendly', 'Calendars', 'CA', '#1a73e8', false, 'Book into your existing Calendly event types.'],
    ['WhatsApp Business', 'Messaging', 'WA', '#1f9d55', true, 'Replies to WhatsApp messages and sends reminders.', '12 messages today'],
    ['Instagram DM', 'Messaging', 'IG', '#c13584', true, 'Answers direct messages and story replies.', '4 messages today'],
    ['Facebook Lead Ads', 'Messaging', 'FB', '#1877f2', false, 'Contacts new ad leads within seconds.'],
    ['SMS (Twilio)', 'Phone', 'SM', '#e5484d', true, 'Two-way texting and missed-call text back.', '(905) 555-0142'],
    ['Voice line', 'Phone', 'VO', '#3d4440', true, 'The AI answers your main number 24/7.', '42 calls today'],
    ['HubSpot', 'CRM', 'HS', '#ff7a59', true, 'Creates contacts and deals with every answer.', 'Synced 3 min ago'],
    ['Salesforce', 'CRM', 'SF', '#00a1e0', false, 'Sync leads and opportunities both ways.'],
    ['Slack', 'Team', 'SL', '#4a154b', true, 'Alerts your team about hot leads and handoffs.', '#front-desk'],
    ['Gmail', 'Team', 'GM', '#c5221f', true, 'Sends confirmations from your own address.', 'hello@abcdental.example'],
    ['Zapier', 'Team', 'ZP', '#ff4f00', false, 'Connect thousands of other apps.'],
    ['Practice software', 'Team', 'PS', '#4d7a00', false, 'Read patient records and visit history (beta).']
  ];
  const cats = ['All', ...new Set(INTS.map((i) => i[1]))];
  let intCat = 'All';
  $('#int-filter').innerHTML = cats.map((c) => `<button type="button" data-cat="${c}" aria-pressed="${c === 'All'}">${c}</button>`).join('');
  function renderInts() {
    $('#int-grid').innerHTML = INTS.map((it, i) => {
      if (intCat !== 'All' && it[1] !== intCat) return '';
      const [n, cat, ini, col, on, desc, meta] = it;
      return `<article class="card int"><div class="int-top"><span class="logo-tile" style="background:${col}">${ini}</span><div><b>${n}</b><small>${cat}</small></div><span class="pill ${on ? 'ok' : 'neutral'}">${on ? 'Connected' : 'Not connected'}</span></div>
        <p>${desc}</p>
        <div class="int-foot"><span>${on ? esc(meta || 'Active') : ''}</span><button class="btn sm ${on ? '' : 'primary'}" type="button" data-int="${i}">${on ? 'Manage' : 'Connect'}</button></div></article>`;
    }).join('');
    const c = INTS.filter((x) => x[4]).length;
    $('#int-filter').setAttribute('title', `${c} connected`);
  }
  $('#int-filter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    intCat = b.dataset.cat;
    $$('#int-filter button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderInts();
  });
  $('#int-grid').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-int]'); if (!b) return;
    const it = INTS[+b.dataset.int];
    if (it[4]) { toast(it[0], 'Connection settings are part of the full product.', 'i-plug'); return; }
    b.disabled = true; b.textContent = 'Connecting…';
    await sleep(1300);
    it[4] = true; it[6] = 'Connected just now';
    renderInts();
    toast(`${it[0]} connected`, 'Prototype: no real account was linked.', 'i-plug');
  });
  renderInts();
  const SYNC = [
    ['i-calendar', 'Google Calendar: booking added for <b>Sarah Ahmed</b>'],
    ['i-refresh', 'HubSpot: contact updated for <b>John Miller</b>, score 86'],
    ['i-message', 'WhatsApp: reminder delivered to <b>Omar Siddiqui</b>'],
    ['i-bell', 'Slack: hot-lead alert posted in <b>#front-desk</b>'],
    ['i-mail', 'Gmail: confirmation sent to <b>maria.lopez@example.com</b>'],
    ['i-phone', 'Voice line: call summary saved for <b>(416) 555-0110</b>'],
    ['i-insta', 'Instagram: AI replied to <b>@danbrooks</b>']
  ];
  const syncItems = SYNC.slice(0, 5).map((s, i) => ({ s, at: Date.now() - (i + 1) * 75000 }));
  let syncIdx = 5;
  const agoS = (t) => { const s = Math.floor((Date.now() - t) / 1000); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`; };
  function renderSync(fresh) { $('#sync-log').innerHTML = syncItems.map((x, i) => `<li class="${fresh && !i ? 'new' : ''}"><span class="feed-ic">${icon(x.s[0])}</span><p>${x.s[1]}</p><small>${agoS(x.at)}</small></li>`).join(''); }
  renderSync();
  setInterval(() => {
    if (window.ELV.current() !== 'integrations' || document.hidden) return;
    syncItems.unshift({ s: SYNC[syncIdx++ % SYNC.length], at: Date.now() }); syncItems.length = 5; renderSync(true);
  }, 4000);
  $('#copy-hook').addEventListener('click', () => {
    const inp = $('#hook-url');
    const done = () => toast('Copied', 'Webhook URL copied to the clipboard.', 'i-check');
    const fallback = () => { inp.select(); toast('Selected', 'Press Ctrl+C to copy the webhook URL.', 'i-code'); };
    try { navigator.clipboard.writeText(inp.value).then(done, fallback); } catch { fallback(); }
  });

  /* ================= CLIENTS (agency) ================= */
  const CLIENTS = [
    ['ABC Dental', 'Dental clinic', 'AD', '#4d7a00', [1, 1, 1], 196, 86, 91, 94],
    ['Northline Roofing', 'Roofing', 'NR', '#b26b00', [0, 1, 1], 142, 38, 87, 88],
    ['Prime Realty Group', 'Real estate', 'PR', '#2f6bd8', [1, 1, 0], 311, 64, 84, 79],
    ['Glow Med Spa', 'Med spa', 'GM', '#c13584', [1, 1, 1], 228, 117, 90, 52],
    ['Hassan & Co. Law', 'Law firm', 'HL', '#3d4440', [0, 1, 1], 87, 21, 82, 85],
    ['City Auto Care', 'Auto repair', 'CA', '#e5484d', [1, 0, 1], 320, 177, 86, 66]
  ];
  const totLeads = CLIENTS.reduce((a, c) => a + c[5], 0), totBooked = CLIENTS.reduce((a, c) => a + c[6], 0);
  $('#cl-stats').innerHTML = [['Active clients', CLIENTS.length], ['Leads handled', totLeads.toLocaleString('en-US')], ['Appointments booked', totBooked], ['Avg. solved by AI', Math.round(CLIENTS.reduce((a, c) => a + c[7], 0) / CLIENTS.length) + '%']]
    .map(([l, v]) => `<article class="card stat"><span>${l}</span><strong class="num">${v}</strong></article>`).join('');
  const sysIc = ['i-calendar', 'i-users', 'i-headset'], sysNm = ['Booking', 'Follow-up', 'Calls'];
  $('#cl-rows').innerHTML = CLIENTS.map(([n, ind, ini, col, sys, leads, booked, solved, health], i) => {
    const hc = health >= 80 ? ['ok', 'Healthy', ''] : health >= 60 ? ['warn', 'Watch', 'mid'] : ['bad', 'At risk', 'low'];
    return `<tr><td><span class="cl-name"><span class="logo-tile" style="background:${col}">${ini}</span><span><b>${esc(n)}</b><span class="sub">${ind}</span></span></span></td>
      <td><span class="sys-icons">${sys.map((on, k) => `<span class="${on ? 'on' : ''}" title="${sysNm[k]}${on ? '' : ' (not active)'}">${icon(sysIc[k])}</span>`).join('')}</span></td>
      <td class="num">${leads}</td><td class="num">${booked}</td><td class="num">${solved}%</td>
      <td><div class="health"><span class="${''}" style="color:var(--${hc[0]})">${hc[1]} · ${health}</span><span class="bar"><i class="${hc[2]}" style="width:${health}%"></i></span></div></td>
      <td><button class="btn sm" type="button" data-client="${i}">Open</button></td></tr>`;
  }).join('');
  $('#cl-rows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-client]'); if (!b) return;
    const c = CLIENTS[+b.dataset.client];
    if (c[0] === 'ABC Dental') { window.ELV.go('overview'); toast('Opened ABC Dental', 'You’re now viewing their console.', 'i-building'); }
    else toast(c[0], 'In the full product this opens their own console with their data.', 'i-building');
  });
  const ALERTS = [
    ['bad', 'GM', 'Glow Med Spa', 'Google Calendar disconnected 2 h ago. New bookings are paused.', 'Reconnect'],
    ['warn', 'CA', 'City Auto Care', 'AI confidence dropped on brake repair prices. 6 answers need review.', 'Review'],
    ['warn', 'PR', 'Prime Realty Group', '14 qualified leads are waiting for an agent call.', 'Notify agents']
  ];
  $('#cl-alerts').innerHTML = ALERTS.map(([k, ini, n, t, a]) => `<li><span class="mini-av ${k === 'warn' ? 'warn' : ''}">${ini}</span><span class="who"><b>${n}</b><span style="white-space:normal">${t}</span></span><button class="btn sm" type="button" data-fake="${a}: this action is part of the full product.">${a}</button></li>`).join('');
  $('#cl-alert-count').textContent = ALERTS.length;

  /* ================= COMMAND PALETTE ================= */
  const dlg = $('#cmdk'), input = $('#cmdk-input'), list = $('#cmdk-list');
  const playDemo = (v) => () => { window.ELV.go(v); setTimeout(() => play(v), 400); };
  function commands() {
    const pages = $$('[data-nav]').map((a) => ({ group: 'Pages', label: a.textContent.replace(/\d+$/, '').trim(), icon: $('use', a).getAttribute('href').slice(1), hint: 'Go to', run: () => window.ELV.go(a.dataset.nav) }));
    const demos = [['booking', 'Play booking demo', 'i-calendar'], ['leads', 'Play lead qualification demo', 'i-users'], ['calls', 'Play AI phone call demo', 'i-headset'], ['workflows', 'Test run the lead workflow', 'i-branch']]
      .map(([v, l, ic]) => ({ group: 'Demos', label: l, icon: ic, hint: 'Play', run: playDemo(v) }));
    const convos = CONVOS.map((c) => ({ group: 'Conversations', label: `${c.name}: ${c.intent}`, icon: c.chIcon, hint: c.ch, run: () => { window.ELV.go('inbox'); selectConvo(c.id); } }));
    const actions = [
      { group: 'Actions', label: 'Test your AI with a question', icon: 'i-spark', hint: 'Playground', run: () => { window.ELV.go('training'); setTimeout(() => $('#pg-input').focus(), 300); } },
      { group: 'Actions', label: 'Switch light or dark mode', icon: 'i-moon', hint: 'Theme', run: toggleTheme },
      { group: 'Actions', label: 'Add a knowledge file', icon: 'i-upload', hint: 'AI Training', run: () => { window.ELV.go('training'); } },
      { group: 'Actions', label: 'See ROI calculator', icon: 'i-chart', hint: 'Analytics', run: () => window.ELV.go('analytics') }
    ];
    return [...pages, ...demos, ...convos, ...actions];
  }
  let items = [], sel = 0;
  function renderCmd() {
    const q = input.value.trim().toLowerCase();
    items = commands().filter((c) => !q || `${c.group} ${c.label} ${c.hint}`.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let html = '', last = '';
    items.forEach((c, i) => {
      if (c.group !== last) { html += `<li class="cmdk-group" role="presentation">${c.group}</li>`; last = c.group; }
      html += `<li class="cmdk-item" role="option" id="cmd-${i}" data-i="${i}" aria-selected="${i === sel}"><span class="ci">${icon(c.icon)}</span><span>${esc(c.label)}</span><small>${esc(c.hint)}</small></li>`;
    });
    list.innerHTML = html || '<li class="empty">No results. Try “demo”, “inbox” or a name.</li>';
    input.setAttribute('aria-activedescendant', items.length ? `cmd-${sel}` : '');
    $(`#cmd-${sel}`)?.scrollIntoView({ block: 'nearest' });
  }
  function openCmd() { if (dlg.open) return; input.value = ''; sel = 0; renderCmd(); dlg.showModal(); input.focus(); }
  function runCmd(i) { const c = items[i]; if (!c) return; dlg.close(); c.run(); }
  $('#cmd-open').addEventListener('click', openCmd);
  input.addEventListener('input', () => { sel = 0; renderCmd(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); renderCmd(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); renderCmd(); }
    else if (e.key === 'Enter') { e.preventDefault(); runCmd(sel); }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) runCmd(+li.dataset.i); });
  list.addEventListener('mousemove', (e) => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; $$('.cmdk-item', list).forEach((x) => x.setAttribute('aria-selected', String(+x.dataset.i === sel))); } });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : openCmd(); }
    else if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); openCmd(); }
  });

  /* ================= route hooks ================= */
  window.ELV.onRoute((id) => { if (id === 'analytics') animateFunnel(); });
})();
