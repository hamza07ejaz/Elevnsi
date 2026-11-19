/* Sample data for the ELEVNSI Console prototype. Nothing here is real. */
window.DEMO = {
  kpis: {
    today: [
      { label: 'New leads', icon: 'i-users', value: '9', delta: '+3', note: 'vs. yesterday', spark: [2, 3, 1, 4, 3, 5, 9] },
      { label: 'Appointments booked', icon: 'i-calendar', value: '6', delta: '+2', note: 'vs. yesterday', spark: [1, 2, 2, 3, 2, 4, 6] },
      { label: 'Qualified leads', icon: 'i-flame', value: '4', delta: '+1', note: 'vs. yesterday', spark: [1, 1, 2, 1, 3, 3, 4] },
      { label: 'Calls answered', icon: 'i-phone', value: '42', delta: '+8', note: 'vs. yesterday', spark: [20, 28, 25, 31, 30, 34, 42] }
    ],
    week: [
      { label: 'New leads', icon: 'i-users', value: '48', delta: '+12%', note: 'vs. last week', spark: [5, 7, 6, 9, 8, 6, 7] },
      { label: 'Appointments booked', icon: 'i-calendar', value: '31', delta: '+18%', note: 'vs. last week', spark: [3, 5, 4, 6, 5, 4, 4] },
      { label: 'Qualified leads', icon: 'i-flame', value: '19', delta: '+9%', note: 'vs. last week', spark: [2, 3, 2, 4, 3, 2, 3] },
      { label: 'Calls answered', icon: 'i-phone', value: '126', delta: '+21%', note: 'vs. last week', spark: [14, 22, 19, 24, 21, 12, 14] }
    ],
    month: [
      { label: 'New leads', icon: 'i-users', value: '196', delta: '+15%', note: 'vs. last month', spark: [38, 44, 41, 52, 48, 56, 61] },
      { label: 'Appointments booked', icon: 'i-calendar', value: '128', delta: '+22%', note: 'vs. last month', spark: [22, 26, 25, 31, 30, 34, 38] },
      { label: 'Qualified leads', icon: 'i-flame', value: '77', delta: '+11%', note: 'vs. last month', spark: [12, 14, 13, 17, 18, 19, 21] },
      { label: 'Calls answered', icon: 'i-phone', value: '512', delta: '+19%', note: 'vs. last month', spark: [96, 110, 104, 121, 118, 130, 141] }
    ]
  },

  week: [
    { d: 'Mon', leads: 5, booked: 3 },
    { d: 'Tue', leads: 7, booked: 5 },
    { d: 'Wed', leads: 6, booked: 4 },
    { d: 'Thu', leads: 9, booked: 6 },
    { d: 'Fri', leads: 8, booked: 5 },
    { d: 'Sat', leads: 6, booked: 4 },
    { d: 'Sun', leads: 7, booked: 4 }
  ],

  feed: [
    { icon: 'i-calendar', g: true, html: '<b>Sarah Ahmed</b> booked a teeth cleaning for Tue 2:00 PM', when: '2 min ago' },
    { icon: 'i-phone', html: 'AI answered a call from <b>(647) 555-0198</b> about whitening prices', when: '6 min ago' },
    { icon: 'i-bell', html: 'Reminder sent to <b>Omar Siddiqui</b> for tomorrow 10:00 AM', when: '9 min ago' },
    { icon: 'i-refresh', html: '<b>Lina Park</b> moved her check-up to Thu 3:00 PM', when: '14 min ago' },
    { icon: 'i-message', html: 'Follow-up sent to <b>David Chen</b> who didn’t finish booking', when: '21 min ago' }
  ],
  feedMore: [
    { icon: 'i-calendar', g: true, html: '<b>Ayesha Malik</b> booked a check-up for Wed 11:00 AM' },
    { icon: 'i-phone', html: 'AI took a message for <b>Dr. Khan</b> from a returning patient' },
    { icon: 'i-flame', g: true, html: 'Hot lead: <b>John Miller</b> is ready for a sales call' },
    { icon: 'i-transfer', html: 'Call about an insurance claim transferred to <b>front desk</b>' },
    { icon: 'i-mail', html: 'Confirmation email sent to <b>maria.lopez@example.com</b>' },
    { icon: 'i-bell', html: 'Reminder sent to <b>Fatima Noor</b> for today 4:00 PM' },
    { icon: 'i-message', html: 'AI replied to a new Instagram lead in <b>4 seconds</b>' }
  ],

  /* Calendar: day 0 = Mon 23 Nov; hour = start hour (9..16) */
  calDays: [['Mon', 23], ['Tue', 24], ['Wed', 25], ['Thu', 26], ['Fri', 27]],
  calHours: [9, 10, 11, 12, 13, 14, 15, 16],
  appts: [
    { day: 0, hour: 9, name: 'Omar Siddiqui', svc: 'Check-up', ai: true },
    { day: 0, hour: 11, name: 'Emma Wilson', svc: 'Filling' },
    { day: 0, hour: 14, name: 'Bilal Hassan', svc: 'Cleaning', ai: true },
    { day: 1, hour: 10, name: 'Grace Lee', svc: 'Whitening' },
    { day: 1, hour: 11, name: 'Hamza Ali', svc: 'Check-up', ai: true },
    { day: 1, hour: 13, name: 'Lunch', svc: 'Blocked' },
    { day: 1, hour: 15, name: 'Noah Brown', svc: 'Root canal' },
    { day: 2, hour: 9, name: 'Lina Park', svc: 'Check-up', ai: true },
    { day: 2, hour: 13, name: 'Lunch', svc: 'Blocked' },
    { day: 2, hour: 14, name: 'Zara Khan', svc: 'Cleaning' },
    { day: 2, hour: 16, name: 'Ali Raza', svc: 'Consult', ai: true },
    { day: 3, hour: 10, name: 'Sophia Martin', svc: 'Braces', ai: true },
    { day: 3, hour: 12, name: 'Usman Tariq', svc: 'Filling' },
    { day: 3, hour: 15, name: 'Lina Park', svc: 'Check-up', ai: true },
    { day: 4, hour: 9, name: 'Ethan Clarke', svc: 'Cleaning' },
    { day: 4, hour: 11, name: 'Mia Johnson', svc: 'Whitening', ai: true },
    { day: 4, hour: 14, name: 'Daniyal Shah', svc: 'Check-up' }
  ],
  offer: [{ day: 1, hour: 14 }, { day: 2, hour: 11 }],

  reminders: [
    { name: 'Omar Siddiqui', ini: 'OS', when: 'Mon 9:00 AM · Check-up', status: ['ok', 'Confirmed'] },
    { name: 'Bilal Hassan', ini: 'BH', when: 'Mon 2:00 PM · Cleaning', status: ['info', 'Sent'] },
    { name: 'Hamza Ali', ini: 'HA', when: 'Tue 11:00 AM · Check-up', status: ['neutral', 'Scheduled'] },
    { name: 'Grace Lee', ini: 'GL', when: 'Tue 10:00 AM · Whitening', status: ['neutral', 'Scheduled'] }
  ],
  changes: [
    { name: 'Lina Park', ini: 'LP', when: 'Wed 9:00 AM → Thu 3:00 PM', status: ['ok', 'Rescheduled'] },
    { name: 'Kevin Wright', ini: 'KW', when: 'Fri 10:00 AM · Cleaning', status: ['bad', 'Cancelled'] },
    { name: 'Hira Aslam', ini: 'HA', when: 'Asked for a later time', status: ['warn', 'Waiting'] }
  ],
  unfinished: [
    { name: 'David Chen', ini: 'DC', when: 'Stopped after picking a day', status: ['info', 'Follow-up 1 sent'] },
    { name: 'Priya Nair', ini: 'PN', when: 'Asked about price, no time picked', status: ['info', 'Follow-up 2 sent'] },
    { name: 'Sam Ortiz', ini: 'SO', when: 'Booked after follow-up', status: ['ok', 'Recovered'] }
  ],

  /* Booking demo script (ABC Dental) */
  bookingScript: [
    { step: 0, sys: 'New WhatsApp lead · 10:42 AM', icon: 'i-message' },
    { them: 'Hi, I want to book a teeth cleaning.' },
    { step: 1, ai: 'Hi! Thanks for messaging ABC Dental. I can book that for you. May I have your full name?' },
    { them: 'Sarah Ahmed' },
    { ai: 'Thanks, Sarah. What day works best for you?' },
    { them: 'Tuesday or Wednesday next week if possible' },
    { step: 2, sys: 'Checking Dr. Khan’s calendar…', icon: 'i-calendar', offer: true, wait: 1500 },
    { ai: 'We have Tuesday at 2 PM or Wednesday at 11 AM. Which one works for you?' },
    { them: 'Tuesday at 2 PM please' },
    { step: 3, book: true, ai: 'You’re booked! Teeth cleaning with Dr. Khan on Tuesday, 24 Nov at 2:00 PM. Please arrive 10 minutes early.' },
    { sys: 'Added to Dr. Khan’s calendar', icon: 'i-check' },
    { step: 4, sys: 'Confirmation sent by WhatsApp and email', icon: 'i-mail' },
    { sys: 'Reminders scheduled: 24 h and 2 h before', icon: 'i-bell' },
    { ai: 'I’ll send you a reminder the day before. Reply here anytime to reschedule or cancel.', done: true }
  ],

  /* Pipeline (Northline Roofing) */
  columns: [
    { id: 'new', name: 'New', color: 'var(--info)' },
    { id: 'interested', name: 'Interested', color: 'var(--green-deep)' },
    { id: 'followup', name: 'Follow-up needed', color: 'var(--warn)' },
    { id: 'qualified', name: 'Qualified', color: 'var(--ok)' },
    { id: 'no', name: 'Not qualified', color: 'var(--faint)' }
  ],
  leads: [
    { id: 'john', col: 'new', name: 'John Miller', need: 'New roof', city: 'Mississauga', src: 'Website', score: 12, when: 'Just now' },
    { id: 'aisha', col: 'new', name: 'Aisha Rahman', need: 'Leak repair', city: 'Brampton', src: 'Facebook', score: 20, when: '8 min' },
    { id: 'tom', col: 'interested', name: 'Tom Becker', need: 'Shingle replacement', city: 'Oakville', src: 'Google Ads', score: 58, when: '1 h' },
    { id: 'nadia', col: 'interested', name: 'Nadia Qureshi', need: 'Gutters + roof check', city: 'Milton', src: 'Website', score: 52, when: '3 h' },
    { id: 'mark', col: 'followup', name: 'Mark Evans', need: 'Flat roof', city: 'Toronto', src: 'Instagram', score: 44, when: '2 d', tag: 'Follow-up 2 of 3' },
    { id: 'chloe', col: 'followup', name: 'Chloe Dubois', need: 'Skylight install', city: 'Mississauga', src: 'Website', score: 40, when: '4 d', tag: 'Follow-up 1 of 3' },
    { id: 'raj', col: 'qualified', name: 'Raj Patel', need: 'Full replacement', city: 'Mississauga', src: 'Referral', score: 91, when: 'Yesterday', tag: 'Sent to sales' },
    { id: 'ellen', col: 'qualified', name: 'Ellen Ward', need: 'Commercial roof', city: 'Etobicoke', src: 'Google Ads', score: 84, when: 'Yesterday', tag: 'Call booked' },
    { id: 'steve', col: 'no', name: 'Steve Novak', need: 'Roof painting', city: 'Hamilton', src: 'Facebook', score: 18, when: '2 d', tag: 'Outside service area' },
    { id: 'kim', col: 'no', name: 'Kim Tran', need: 'Just browsing', city: 'Toronto', src: 'Website', score: 10, when: '3 d', tag: 'Not interested' }
  ],
  leadChats: {
    aisha: [{ them: 'Hi, my roof is leaking near the chimney.' }, { ai: 'Sorry to hear that, Aisha. What city is the property in?' }],
    tom: [{ them: 'Need some shingles replaced after the storm.' }, { ai: 'We can help. Is it residential or commercial?' }, { them: 'Residential, Oakville.' }, { ai: 'Thanks! How soon do you need it done?' }],
    nadia: [{ them: 'Can you check my gutters and roof?' }, { ai: 'Of course. Is the property in Milton?' }, { them: 'Yes.' }],
    mark: [{ them: 'Quote for a flat roof?' }, { ai: 'Sure! Is it residential or commercial?' }, { sys: 'No reply for 2 days', icon: 'i-clock', gap: true }, { ai: 'Hi Mark, just checking in. Are you still looking for a flat roof quote?' }],
    chloe: [{ them: 'How much for a skylight?' }, { ai: 'Happy to help, Chloe. How soon would you like it installed?' }, { sys: 'No reply for 4 days', icon: 'i-clock', gap: true }],
    raj: [{ them: 'Need my whole roof replaced.' }, { ai: 'What city is the property in?' }, { them: 'Mississauga, residential, within 2 weeks.' }, { sys: 'Qualified · sent to sales team', icon: 'i-flame' }],
    ellen: [{ them: 'We need a quote for our office building roof.' }, { ai: 'Great. How large is the roof, roughly?' }, { them: 'About 8,000 sq ft. This month.' }, { sys: 'Qualified · call booked with sales', icon: 'i-flame' }],
    steve: [{ them: 'Do you paint roofs in Hamilton?' }, { ai: 'Thanks for asking, Steve. Hamilton is outside our service area, sorry about that.' }],
    kim: [{ them: 'Just looking at prices.' }, { ai: 'No problem! Would you like a free inspection?' }, { them: 'Not right now, thanks.' }]
  },
  qualQs: [
    { id: 'need', q: 'Service needed', a: 'New roof' },
    { id: 'city', q: 'Location in service area', a: 'Mississauga' },
    { id: 'type', q: 'Property type', a: 'Residential' },
    { id: 'when', q: 'Timeline', a: 'Within a month' },
    { id: 'reply', q: 'Engaged after follow-up', a: 'Yes' }
  ],
  sequence: [
    { day: 'Day 0', title: 'First reply', text: 'AI responds within seconds and asks qualification questions.' },
    { day: 'Day 2', title: 'Follow-up 1', text: '“Hi John, just checking in. Are you still looking to get your roof replaced?”' },
    { day: 'Day 5', title: 'Follow-up 2', text: '“A quick reminder: we offer free roof inspections in Mississauga this month.”' },
    { day: 'Day 9', title: 'Final follow-up', text: '“Should I close your request, or would you still like a quote?”' }
  ],
  leadScript: [
    { sys: 'New lead from website form · 9:15 AM', icon: 'i-message' },
    { them: 'I need a new roof.', q: 'need', score: 20, seq: 0, status: ['info', 'New'] },
    { ai: 'Sure, John. What city is the property located in?' },
    { them: 'Mississauga.', q: 'city', score: 40 },
    { ai: 'Is it a residential or commercial property?' },
    { them: 'Residential.', q: 'type', score: 55, status: ['ok', 'Interested'], move: 'interested' },
    { ai: 'How soon are you looking to get the roof replaced?' },
    { sys: 'No reply for 2 days', icon: 'i-clock', gap: true, status: ['warn', 'Follow-up needed'], move: 'followup', wait: 1200 },
    { ai: 'Hi John, just checking in. Are you still looking to get your roof replaced?', seq: 1 },
    { them: 'Yes! Within the next month if possible.', q: 'when', score: 78, stop: true },
    { q: 'reply', score: 86, sys: 'Lead replied · remaining follow-ups stopped', icon: 'i-check' },
    { ai: 'Great. One of our roofing specialists will call you today to set up a free inspection.', status: ['ok', 'Qualified'], move: 'qualified', hot: true }
  ],

  /* Call agent (ABC Dental) */
  callScript: [
    { state: 'ringing', label: 'Incoming call', wait: 1800 },
    { state: 'talking', ai: 'Hi, thank you for calling ABC Dental. How can I help you today?' },
    { caller: 'Hi, I want to know if you guys do teeth whitening and how much it costs.', fact: ['reason', 'Teeth whitening: price'] },
    { ai: 'Yes, we do. In-office whitening is $299 and takes about an hour. We also have take-home kits for $189.', action: 'Looked up services and prices' },
    { caller: 'Okay. Can I book an appointment for Friday?' },
    { ai: 'Let me check. On Friday we have 10:30 AM or 3:00 PM. Which works better?', action: 'Checked Dr. Khan’s calendar' },
    { caller: '3 PM works.' },
    { ai: 'Great. Can I have your name and email for the confirmation?' },
    { caller: 'Maria Lopez, maria.lopez@example.com', fact: ['name', 'Maria Lopez'], fact2: ['email', 'maria.lopez@example.com'] },
    { ai: 'Thanks, Maria. You’re booked for teeth whitening on Friday at 3:00 PM. A confirmation is on its way.', action: 'Booked Fri 27 Nov, 3:00 PM', fact: ['booked', 'Whitening · Fri 3:00 PM'] },
    { caller: 'One more thing. I have a question about an insurance claim from my last visit.' },
    { ai: 'I’ll transfer you to someone from our team who can help you further. One moment please.', action: 'Transferring to front desk', state: 'transfer', fact: ['outcome', 'Booked + transferred to front desk'] },
    { end: true }
  ],
  facts: [
    ['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['reason', 'Reason'], ['booked', 'Booked'], ['outcome', 'Outcome']
  ],
  callLog: [
    { t: '10:31 AM', name: 'Maria Lopez', num: '(647) 555-0198', reason: 'Whitening price, booking', out: ['ok', 'Booked'], dur: '3:12', by: 'AI → Front desk' },
    { t: '10:12 AM', name: 'Unknown caller', num: '(416) 555-0110', reason: 'Opening hours on Saturday', out: ['ok', 'Answered'], dur: '0:48', by: 'AI' },
    { t: '9:58 AM', name: 'Omar Siddiqui', num: '(905) 555-0177', reason: 'Reschedule check-up', out: ['info', 'Rescheduled'], dur: '1:35', by: 'AI' },
    { t: '9:40 AM', name: 'Grace Lee', num: '(289) 555-0123', reason: 'Tooth pain, urgent', out: ['warn', 'Transferred'], dur: '1:02', by: 'AI → Dr. Khan' },
    { t: '9:21 AM', name: 'Hassan Javed', num: '(905) 555-0164', reason: 'Insurance accepted?', out: ['ok', 'Answered'], dur: '1:10', by: 'AI' },
    { t: '8:05 AM', name: 'Lucy Grant', num: '(647) 555-0151', reason: 'Message for billing', out: ['neutral', 'Message taken'], dur: '0:55', by: 'AI (after hours)' }
  ],

  /* Setup */
  hours: [['Monday', '9:00 AM – 5:00 PM'], ['Tuesday', '9:00 AM – 5:00 PM'], ['Wednesday', '9:00 AM – 5:00 PM'], ['Thursday', '9:00 AM – 7:00 PM'], ['Friday', '9:00 AM – 5:00 PM'], ['Saturday', '10:00 AM – 2:00 PM'], ['Sunday', 'Closed']],
  services: [['Teeth cleaning', '45 min', '$140', true], ['Check-up & X-rays', '30 min', '$95', true], ['In-office whitening', '60 min', '$299', true], ['Filling', '45 min', 'From $180', true], ['Root canal', '90 min', 'Quote after exam', false]],
  questions: ['What service do you need?', 'What city is the property in?', 'Is it residential or commercial?', 'How soon do you need it done?', 'Do you have a budget in mind?'],
  toggles: [
    ['WhatsApp', 'Reply to WhatsApp messages', true], ['SMS', 'Reply to text messages', true],
    ['Website chat', 'Chat widget on your site', true], ['Phone calls', 'AI answers incoming calls', true],
    ['Answer 24/7', 'Including nights and weekends', true], ['Hot-lead alerts', 'Notify sales by SMS', true],
    ['Daily summary', 'Email at 6:00 PM', false], ['Important caller alert', 'VIP and urgent calls', true]
  ]
};
