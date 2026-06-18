/* Cadence — UI + interactions. Vanilla JS, no build step. */

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');

let view = 'today';           // onboard | today | priorities | notes | note | focus | you
let onbStep = 1;
let ob = { name: '', identity: 'getting better', sugg: '20-minute walk', windDown: null };
let comeback = null;          // {gap, parkedCount} after a break
let timer = { id: null, total: 25 * 60, remaining: 25 * 60, handle: null, running: false, endAt: 0 };
let inFocus = false;          // Do Not Disturb: true while a focus session is running
let currentNoteId = null;
let lastRenderedView = null;

/* ---------------- icons (inline SVG, offline-safe) ---------------- */
const PATHS = {
  check: '<path d="M5 12l5 5L20 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z"/><path d="M12 14c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  feather: '<path d="M20 4C12 4 7 9 7 15v2l-3 3"/><path d="M7 13h7"/><path d="M16 8l-8 8"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  heart: '<path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/>',
  coffee: '<path d="M5 9h12v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M11 3v2M14 3v2"/>',
  party: '<path d="M4 20l5-13 9 9z"/><path d="M14 6c1-1 3-1 4 0M16 3v2M20 7h2M19 10l1 1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  bolt: '<path d="M13 2L4 14h7l-2 8 9-12h-7z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  listCheck: '<path d="M4 7h10M4 12h10M4 17h10M17.5 6l-2 2L14 6.5M17.5 13l-2 2L14 13.5"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>',
  activity: '<path d="M3 12h4l2-6 4 14 2-8h6"/>',
  dumbbell: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h6v17H6a2 2 0 0 1-2-2z"/><path d="M20 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 0 2-2z"/>',
  droplet: '<path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z"/>',
  pencil: '<path d="M4 20l1-4 11-11 3 3-11 11z"/><path d="M14 7l3 3"/>'
};
function ic(name, size) {
  size = size || 22;
  return '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" width="' + size + '" height="' + size + '">' +
    (PATHS[name] || '') + '</svg>';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
function prettyDate() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const p = t.split(':'); let h = parseInt(p[0], 10); const m = p[1] || '00';
  const ampm = h < 12 ? 'AM' : 'PM'; let hr = h % 12; if (hr === 0) hr = 12;
  return hr + ':' + m + ' ' + ampm;
}
function relTime(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

/* ---------------- Eisenhower lanes ---------------- */
const LANES = {
  do: { name: 'Do now', desc: 'important + urgent', icon: 'bolt', bg: '#EAF3DE', fg: '#27500A', act: '#639922' },
  plan: { name: 'Plan', desc: 'important · long game', icon: 'calendar', bg: '#E6F1FB', fg: '#0C447C', act: '#185FA5' },
  quick: { name: 'Quick', desc: 'urgent · do fast', icon: 'arrowRight', bg: '#FAEEDA', fg: '#633806', act: '#BA7517' },
  letgo: { name: 'Let go', desc: 'a win, not a failure', icon: 'feather', bg: '#FAECE7', fg: '#712B13', act: '#D85A30' }
};
function laneOf(p) { return p.important && p.urgent ? 'do' : p.important ? 'plan' : p.urgent ? 'quick' : 'letgo'; }

/* ---------------- init ---------------- */
function init() {
  const s = Store.get();
  if (!s.onboarded) {
    view = 'onboard'; onbStep = 1;
  } else {
    const r = Store.rollDay();
    if (r.rolled && r.gap > 1) comeback = { gap: r.gap, parkedCount: r.parkedCount };
    view = 'today';
  }
  render();
  registerSW();
}

/* ---------------- render dispatch ---------------- */
function render() {
  if (view === 'onboard') app.innerHTML = renderOnboard();
  else if (view === 'focus') app.innerHTML = renderFocus();
  else app.innerHTML = renderShell(
    view === 'you' ? renderYou() :
      view === 'priorities' ? renderPriorities() :
        view === 'notes' ? renderNotes() :
          view === 'note' ? renderNote() :
            renderToday()
  );
  if (view === 'note') { const c = document.getElementById('note-lines'); if (c) c.querySelectorAll('.nl-in').forEach(autoGrow); }
  if (view !== lastRenderedView) { window.scrollTo(0, 0); lastRenderedView = view; }
}
function renderShell(inner) {
  return '<div class="screen">' + inner + '</div>' + renderNav();
}
function renderNav() {
  const on = (v) => (view === v) || (v === 'notes' && view === 'note');
  const tab = (v, name, label) =>
    '<button class="navbtn ' + (on(v) ? 'on' : '') + '" onclick="go(\'' + v + '\')">' +
    ic(name, 21) + '<span>' + label + '</span></button>';
  return '<nav class="nav">' +
    tab('today', 'sun', 'Today') +
    tab('priorities', 'listCheck', 'Priorities') +
    '<button class="fab" aria-label="Add" onclick="openCapture()">' + ic('plus', 24) + '</button>' +
    tab('notes', 'note', 'Notes') +
    tab('you', 'user', 'You') +
    '</nav>';
}
function go(v) {
  if (view === 'note') noteLeaveCleanup();
  view = v; render();
}

/* ---------------- onboarding ---------------- */
function renderOnboard() {
  const dots = [1, 2, 3, 4, 5, 6].map(n =>
    '<span class="' + (n === onbStep ? 'on' : '') + '"></span>').join('');
  let body = '';
  if (onbStep === 1) {
    body =
      '<div class="ob center">' +
      '<div class="ob-badge">' + ic('feather', 30) + '</div>' +
      '<h1>A planner you can\'t fall behind in</h1>' +
      '<p class="muted">Plan a kind, winnable day. Drop off whenever — there\'s never any catching up.</p>' +
      '<button class="cta mt-auto" onclick="obNext(2)">Begin</button></div>';
  } else if (onbStep === 2) {
    body =
      '<div class="ob">' +
      '<h2>First — what should I call you?</h2><p class="muted sm">Just a first name is perfect.</p>' +
      '<input id="ob-name" placeholder="Your name" value="' + esc(ob.name) + '" />' +
      '<button class="cta" style="margin-top:14px" onclick="obName(false)">Continue</button>' +
      '<button class="ghost" onclick="obName(true)">Skip</button>' +
      '</div>';
  } else if (onbStep === 3) {
    const chip = (label, idv, sugg) =>
      '<button class="chip" onclick="obIdentity(\'' + idv + '\',\'' + sugg + '\')">' + label + '</button>';
    body =
      '<div class="ob">' +
      '<h2>One thing you\'d love to get better at?</h2><p class="muted sm">We\'ll quietly connect your days to it.</p>' +
      chip('Study consistently', 'studying consistently', 'Study — 1 focused hour') +
      chip('Get fit', 'getting fit', '20-minute walk') +
      chip('Stay on top of work', 'staying on top of work', 'Clear my top task') +
      chip('Read more', 'reading more', 'Read 10 pages') +
      '<button class="ghost" onclick="obNext(4)">Skip</button></div>';
  } else if (onbStep === 4) {
    body =
      '<div class="ob center">' +
      '<div class="row gap8 mb16"><span class="num">1</span><span class="num">2</span><span class="num">3</span></div>' +
      '<h2>Each day, pick just 1–3 things that matter</h2>' +
      '<p class="muted">Do those, and you\'ve <b class="teal">won the day.</b> Everything else is a bonus — never a debt.</p>' +
      '<button class="cta mt-auto" onclick="obNext(5)">Got it</button></div>';
  } else if (onbStep === 5) {
    body =
      '<div class="ob">' +
      '<h2>When\'s your usual bedtime?</h2>' +
      '<p class="muted sm">I\'ll show a gentle “time left today,” measured to your bedtime — calm awareness, never a countdown to stress over. Totally optional.</p>' +
      '<div class="wind-opts">' +
      '<button class="wind-chip" onclick="obWind(\'21:00\')">9:00 PM</button>' +
      '<button class="wind-chip" onclick="obWind(\'22:00\')">10:00 PM</button>' +
      '<button class="wind-chip" onclick="obWind(\'23:00\')">11:00 PM</button>' +
      '<button class="wind-chip" onclick="obWind(\'00:00\')">12:00 AM</button>' +
      '</div>' +
      '<div class="wind-custom"><span class="addmeta-lab">' + ic('clock', 14) + ' Custom</span>' +
      '<input id="ob-wind" type="time" aria-label="Custom bedtime" />' +
      '<button class="add" onclick="obWindCustom()">Use</button></div>' +
      '<button class="ghost" onclick="obWind(null)">No specific time — keep it off</button>' +
      '</div>';
  } else {
    body =
      '<div class="ob">' +
      '<h2>What\'s one thing for today?</h2><p class="muted sm">Just one is plenty to start.</p>' +
      '<input id="ob-first" value="' + esc(ob.sugg) + '" />' +
      '<div class="vote">' + ic('heart', 16) + ' A vote for <b>' + esc(ob.identity) + '</b></div>' +
      '<button class="cta" onclick="obFinish()">Add &amp; see my day</button></div>';
  }
  return '<div class="onboard">' + (onbStep <= 6 ? '<div class="dots">' + dots + '</div>' : '') + body + '</div>';
}
function obNext(n) { onbStep = n; render(); }
function obName(skip) {
  if (!skip) { const el = document.getElementById('ob-name'); ob.name = (el && el.value.trim()) || ''; }
  else { ob.name = ''; }
  onbStep = 3; render();
}
function obIdentity(id, sugg) { ob.identity = id; ob.sugg = sugg; onbStep = 4; render(); }
function obWind(v) { ob.windDown = v || null; onbStep = 6; render(); }
function obWindCustom() { const el = document.getElementById('ob-wind'); ob.windDown = (el && el.value) || null; onbStep = 6; render(); }
function obFinish() {
  const el = document.getElementById('ob-first');
  const first = el && el.value.trim();
  const t = Store.todayStr();
  Store.set({
    onboarded: true, name: ob.name, identity: ob.identity || 'getting better',
    windDownTime: ob.windDown || null,
    momentum: 1, lastMomentumDate: t, currentDate: t, lastActiveDate: t,
    focus: first ? [{ id: Store.uid(), title: first, done: false }] : []
  });
  view = 'today'; render();
  toast((ob.name ? 'You\'re set, ' + ob.name + '. ' : 'You\'re set. ') + 'Today\'s already a win waiting.');
}

/* ---------------- today ---------------- */
function renderToday() {
  const s = Store.get();
  const allDone = s.focus.length > 0 && s.focus.every(i => i.done);
  let html = '';

  html +=
    '<header class="head"><div>' +
    '<div class="muted sm">' + esc(prettyDate()) + '</div>' +
    '<h1>' + greeting() + (s.name ? ', ' + esc(s.name) : '') + '</h1></div>' +
    '<span class="pill">' + ic('sprout', 14) + ' Day ' + s.momentum + '</span></header>';

  if (comeback) {
    html +=
      '<div class="banner soft">' +
      '<div><b>Welcome back' + (s.name ? ', ' + esc(s.name) : '') + ' — it\'s a clean page.</b>' +
      '<div class="sm muted">' + (comeback.parkedCount > 0
        ? comeback.parkedCount + ' item' + (comeback.parkedCount > 1 ? 's are' : ' is') + ' parked if you want ' + (comeback.parkedCount > 1 ? 'them' : 'it') + '.'
        : 'Pick one thing and you\'re moving again.') + '</div></div>' +
      '<button class="iconbtn" aria-label="Dismiss" onclick="clearComeback()">' + ic('x', 18) + '</button></div>';
  }

  if (allDone) {
    html +=
      '<div class="banner win pop">' + ic('party', 22) +
      '<div><b>You won today</b><div class="sm">Rest is part of it. See you tomorrow.</div></div></div>';
  }

  html += renderRunway(s, allDone);

  html += '<section class="block"><div class="block-head"><h2>Today\'s focus</h2>' +
    '<span class="faint sm">1–3 things that matter</span></div>';
  if (s.focus.length === 0) {
    html += '<p class="empty">Pick the one or two things that would make today a win.</p>';
  } else {
    html += sortedFocus(s.focus).map(i => focusRow('focus', i)).join('');
  }
  if (s.focus.length < 3) {
    html +=
      '<div class="addform">' +
      '<input id="add-focus" placeholder="Add a focus…" onkeydown="if(event.key===\'Enter\')addFocus()" />' +
      '<div class="addmeta">' +
      '<span class="addmeta-lab">' + ic('clock', 14) + ' Time <span class="faint">(optional)</span></span>' +
      '<input id="add-time" type="time" aria-label="Time (optional)" />' +
      '<button class="add wide" onclick="addFocus()">' + ic('plus', 16) + ' Add</button>' +
      '</div></div>';
  }
  html += '</section>';

  html += renderRhythm(s);

  html += '<section class="block"><div class="block-head"><h2 class="quiet">Bonus</h2>' +
    '<span class="faint sm">only if you have energy</span></div>';
  if (allDone && s.bonus.some(i => !i.done)) {
    html += '<p class="bonus-hint">' + ic('party', 13) + ' Day\'s already won — give a bonus your focus only if you feel like it.</p>';
  }
  if (s.bonus.length === 0) {
    html += '<p class="empty sm">Nothing here — and that\'s fine.</p>';
  } else {
    html += s.bonus.map(i => bonusRow(i, allDone)).join('');
  }
  html += '</section>';

  if (s.parked.length > 0) {
    html +=
      '<button class="parked" onclick="go(\'you\')">' +
      s.parked.length + ' item' + (s.parked.length > 1 ? 's' : '') + ' parked, if you want ' + (s.parked.length > 1 ? 'them' : 'it') +
      '<span class="faint">›</span></button>';
  }

  html += '<p class="footnote">Do your focus and today\'s a win.</p>';
  return html;
}

/* ---------------- day's runway (opt-in, calm time-left until wind-down) ----------------
   Wall-clock based, like the focus timer: time-left is derived from Date.now() and re-synced
   on resume, never counted down — so it can't freeze when the screen sleeps. */
function bedtimeDate(hhmm) {
  const parts = String(hhmm).split(':');
  const h = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;
  const bed = new Date(); bed.setHours(h, m, 0, 0);
  // A post-midnight wind-down (12–5 AM) refers to tonight, not this morning.
  if (bed.getTime() <= Date.now() && h < 6) bed.setDate(bed.getDate() + 1);
  return bed;
}
function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h <= 0 ? m + 'm' : (m === 0 ? h + 'h' : h + 'h ' + m + 'm');
}
function fmtClock(d) {
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM'; let hr = h % 12; if (hr === 0) hr = 12;
  return hr + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
function renderRunway(s, allDone) {
  if (!s.windDownTime || s.onBreak) return '';   // opt-in only, and never during a break
  const bed = bedtimeDate(s.windDownTime);
  const remMs = bed.getTime() - Date.now();
  if (remMs <= 0) {
    return '<div class="card runway rest" id="runway">' +
      '<div class="runway-head">' + ic('moon', 16) + '<span>Past your bedtime</span></div>' +
      '<div class="runway-msg">Rest easy — today\'s done, and tomorrow\'s a clean page.</div></div>';
  }
  const remMin = Math.max(1, Math.round(remMs / 60000));
  const windowMs = 16 * 3600 * 1000;             // ~waking day, only for the bar's proportion
  const frac = Math.max(0.03, Math.min(1, remMs / windowMs));
  const wake = new Date(bed.getTime() - windowMs);
  let msg;
  if (allDone) msg = 'Day\'s already won — the rest is yours, to enjoy or to rest.';
  else if (remMin >= 120) msg = 'Plenty of time — your focus fits easily.';
  else if (remMin >= 30) msg = 'A good window left. One focus at a time.';
  else msg = 'Almost wind-down — a small thing, or call it a day. Both win.';
  return '<div class="card runway" id="runway">' +
    '<div class="runway-head">' + ic('sun', 16) + '<span>Your day\'s runway</span></div>' +
    '<div class="runway-num"><b>' + fmtDur(remMin) + '</b><span class="sm muted">left before bed</span></div>' +
    '<div class="runway-bar"><div class="runway-fill" style="width:' + Math.round(frac * 100) + '%"></div></div>' +
    '<div class="runway-ends"><span>' + fmtClock(wake) + '</span><span>' + fmtClock(bed) + '</span></div>' +
    '<div class="runway-msg">' + msg + '</div>' +
    '</div>';
}
// Update only the runway card in place, so a resume/refresh never disturbs inputs elsewhere on Today.
function refreshRunway() {
  if (view !== 'today') return;
  const el = document.getElementById('runway');
  if (!el) return;
  const s = Store.get();
  const wrap = document.createElement('div');
  wrap.innerHTML = renderRunway(s, s.focus.length > 0 && s.focus.every(i => i.done));
  const fresh = wrap.firstElementChild;
  if (fresh) el.replaceWith(fresh); else el.remove();
}

function sortedFocus(arr) {
  return arr.slice().sort(function (a, b) {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    const ta = a.time || '99:99', tb = b.time || '99:99';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}
function focusRow(list, i) {
  const meta = i.time ? '<div class="rowmeta"><span class="mi">' + ic('clock', 12) + fmtTime(i.time) + '</span></div>' : '';
  return '<div class="card focusrow ' + (i.done ? 'done' : '') + '">' +
    '<button class="chk" aria-label="Complete" onclick="toggle(\'' + list + '\',\'' + i.id + '\')">' + ic('check', 15) + '</button>' +
    '<div class="grow"><div class="title">' + esc(i.title) + '</div>' + meta + '</div>' +
    (i.done ? '' : '<button class="start" onclick="startFocus(\'' + i.id + '\')">' + ic('play', 13) + ' Start</button>') +
    '</div>';
}
function bonusRow(i, won) {
  // Once today's focus is all done, a bonus item can be promoted into Focus (and timed) — a "bonus round".
  const promote = !i.done
    ? '<button class="bonus-focus' + (won ? '' : ' muted') + '" onclick="promoteBonusFocus(\'' + i.id + '\')">' + ic('play', 11) + ' Focus</button>'
    : '';
  return '<div class="bonusrow ' + (i.done ? 'done' : '') + '">' +
    '<button class="chk sm" aria-label="Complete" onclick="toggle(\'bonus\',\'' + i.id + '\')">' + ic('check', 13) + '</button>' +
    '<span class="grow">' + esc(i.title) + '</span>' +
    promote +
    '<button class="iconbtn faint" aria-label="Remove" onclick="dropBonus(\'' + i.id + '\')">' + ic('x', 15) + '</button>' +
    '</div>';
}

function addFocus() {
  const el = document.getElementById('add-focus');
  const t = el && el.value.trim();
  if (!t) return;
  const timeEl = document.getElementById('add-time');
  const time = (timeEl && timeEl.value) || '';
  const s = Store.get();
  if (s.focus.length >= 3) {
    s.bonus.push({ id: Store.uid(), title: t, done: false });
    Store.save(); render();
    toast('That\'s a full focus list — saved to Bonus for today.');
    return;
  }
  s.focus.push({ id: Store.uid(), title: t, done: false, time: time });
  Store.save(); render();
  const ni = document.getElementById('add-focus'); if (ni) ni.focus();
}
function toggle(list, id) {
  const s = Store.get();
  const it = s[list].find(x => x.id === id);
  if (!it) return;
  it.done = !it.done;
  if (it.done) {
    Store.touchMomentum();
    Store.logEvent({ t: 'done', title: it.title, list: list, viaFocus: false });
  }
  Store.save(); render();
}
function dropBonus(id) {
  const s = Store.get();
  s.bonus = s.bonus.filter(x => x.id !== id);
  Store.save(); render();
}
/* Bonus round: only after today's focus is fully won, move a bonus item into Focus and start a session. */
function promoteBonusFocus(id) {
  const s = Store.get();
  const won = s.focus.length > 0 && s.focus.every(i => i.done);
  if (!won) { toast('Finish today\'s focus first — then a bonus round opens.'); return; }
  const idx = s.bonus.findIndex(x => x.id === id);
  if (idx === -1) return;
  const item = s.bonus.splice(idx, 1)[0];
  item.done = false;
  item.origin = 'bonus';           // keep provenance for v2 insights
  s.focus.push(item);              // it's now a real focus item — timer/finish logic works unchanged
  Store.save();
  startFocus(item.id);            // open the duration picker → begin the bonus round
}
function clearComeback() { comeback = null; render(); }

/* ---------------- capture ---------------- */
function openCapture() {
  const dest = (tg, icon, label) =>
    '<button class="cap-btn" onclick="capture(\'' + tg + '\')">' + ic(icon, 18) + ' ' + label + '</button>';
  overlay.innerHTML =
    '<div class="sheet-bg" onclick="closeCapture()"></div>' +
    '<div class="sheet"><div class="sheet-grip"></div>' +
    '<h3>Add anything</h3>' +
    '<input id="cap-input" placeholder="What\'s on your mind?" onkeydown="if(event.key===\'Enter\')capture(\'focus\')" />' +
    '<div class="cap-lab">Send it to…</div>' +
    '<div class="cap-dest">' +
    dest('focus', 'sun', 'Focus') +
    dest('bonus', 'plus', 'Bonus') +
    dest('priority', 'listCheck', 'Priority') +
    dest('note', 'note', 'Note') +
    dest('daily', 'sprout', 'Daily') +
    '</div></div>';
  overlay.classList.add('show');
  setTimeout(() => { const el = document.getElementById('cap-input'); if (el) el.focus(); }, 50);
}
function closeCapture() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
function capture(target) {
  const el = document.getElementById('cap-input');
  const t = el && el.value.trim();
  if (!t) { closeCapture(); return; }
  const s = Store.get();
  if (target === 'daily') {
    habitDraft = { id: null, title: t, icon: 'sprout', type: 'daily', perWeek: 3, days: [0, 2, 4] };
    showHabitSheet();   // swaps the capture sheet for the cadence sheet, prefilled
    return;
  }
  if (target === 'note') {
    const n = { id: Store.uid(), title: '', body: t, day: '', updated: Date.now() };
    s.notes.push(n); Store.save(); closeCapture();
    currentNoteId = n.id; noteActiveLine = 0; view = 'note'; render();
    return;
  }
  let dest = 'today';
  if (target === 'priority') {
    s.priorities.push({ id: Store.uid(), title: t, important: true, urgent: false, done: false });
    dest = 'priorities'; toast('Added to Priorities · Plan.');
  } else if (target === 'bonus') {
    s.bonus.push({ id: Store.uid(), title: t, done: false });
    toast('Saved to Bonus.');
  } else {
    if (s.focus.length < 3) { s.focus.push({ id: Store.uid(), title: t, done: false }); toast('On today\'s focus.'); }
    else { s.bonus.push({ id: Store.uid(), title: t, done: false }); toast('Focus was full — saved to Bonus.'); }
  }
  Store.save(); closeCapture();
  if (view !== dest) go(dest); else render();
}

/* ---------------- focus / momentum mode ---------------- */
const FOCUS_OPTIONS = [15, 25, 45, 60];   // duration chips (minutes)
let pendingFocusId = null;                 // task awaiting a duration choice
let pickMins = 25;                         // currently selected duration
let pickCustomOn = false;                  // custom input revealed?

function startFocus(id) {
  const s = Store.get();
  pendingFocusId = id;
  pickMins = clampMins(s.focusMins || 25);
  pickCustomOn = FOCUS_OPTIONS.indexOf(pickMins) === -1;
  showFocusPicker();
}
function clampMins(v) { return Math.max(1, Math.min(180, Math.round(+v) || 25)); }
function showFocusPicker() {
  const it = Store.get().focus.find(x => x.id === pendingFocusId) || { title: 'Focus' };
  const chips = FOCUS_OPTIONS.map(m =>
    '<button class="dur-chip' + (!pickCustomOn && m === pickMins ? ' sel' : '') +
    '" onclick="pickDur(' + m + ')">' + m + ' min</button>').join('');
  overlay.innerHTML =
    '<div class="sheet-bg" onclick="closeFocusPicker()"></div>' +
    '<div class="sheet"><div class="sheet-grip"></div>' +
    '<h3>Ready to focus</h3>' +
    '<div class="picker-task">' + ic('clock', 14) + ' ' + esc(it.title) + '</div>' +
    '<div class="dur-label">Session length</div>' +
    '<div class="dur-chips">' + chips +
    '<button class="dur-chip' + (pickCustomOn ? ' sel' : '') + '" onclick="pickCustomDur()">Custom</button></div>' +
    (pickCustomOn
      ? '<div class="row gap8 dur-customrow"><input id="dur-custom" type="number" min="1" max="180" inputmode="numeric" value="' + pickMins + '" onkeydown="if(event.key===\'Enter\')beginFocus()" /><span class="faint">minutes</span></div>'
      : '') +
    '<button class="cta grow mt12" onclick="beginFocus()">' + ic('play', 16) + ' Begin</button>' +
    '</div>';
  overlay.classList.add('show');
  if (pickCustomOn) setTimeout(() => { const el = document.getElementById('dur-custom'); if (el) el.focus(); }, 50);
}
function pickDur(m) { pickMins = m; pickCustomOn = false; showFocusPicker(); }
function pickCustomDur() {
  const el = document.getElementById('dur-custom');
  if (el) pickMins = clampMins(el.value);
  pickCustomOn = true; showFocusPicker();
}
function closeFocusPicker() { overlay.classList.remove('show'); overlay.innerHTML = ''; pendingFocusId = null; }
function beginFocus() {
  const id = pendingFocusId;
  if (!id) { closeFocusPicker(); return; }
  if (pickCustomOn) { const el = document.getElementById('dur-custom'); if (el) pickMins = clampMins(el.value); }
  const mins = clampMins(pickMins);
  const s = Store.get(); s.focusMins = mins; Store.save();
  closeFocusPicker();
  timer.id = id;
  timer.total = mins * 60; timer.remaining = mins * 60; timer.running = true;
  timer.endAt = Date.now() + timer.total * 1000;   // wall-clock anchor: survives screen-off / tab suspend
  inFocus = true;
  view = 'focus'; render();
  startTick();
}
function startTick() {
  stopTick();
  // The interval is only a render heartbeat — the source of truth is timer.endAt (wall clock).
  // If the OS suspends timers while the screen is off, the next tick (or visibilitychange) snaps
  // straight to the correct value instead of resuming from where it froze.
  timer.handle = setInterval(syncTimer, 1000);
}
function stopTick() { if (timer.handle) { clearInterval(timer.handle); timer.handle = null; } }
// Recompute remaining from the wall clock and repaint. Safe to call any time (no-op outside focus).
function syncTimer() {
  if (!inFocus) return;
  if (timer.running) {
    timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    if (timer.remaining === 0) {
      timer.running = false;
      stopTick();
      paintTimer();
      toast('Time\'s up — nice focus.');
      return;
    }
  }
  paintTimer();
}
function paintTimer() {
  const t = document.getElementById('timer-time');
  const r = document.getElementById('ring-prog');
  if (t) t.textContent = fmt(timer.remaining);
  if (r) r.style.strokeDashoffset = ringOffset();
}
function fmt(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function ringOffset() {
  const C = 2 * Math.PI * 78;
  const done = 1 - timer.remaining / timer.total;
  return (C * done).toFixed(1);
}
function renderFocus() {
  const s = Store.get();
  const it = s.focus.find(x => x.id === timer.id) || { title: 'Focus' };
  const C = (2 * Math.PI * 78).toFixed(1);
  return '<div class="focusview">' +
    '<button class="iconbtn back" aria-label="Back" onclick="exitFocus()">' + ic('back', 22) + '</button>' +
    '<div class="dnd">' + ic('moon', 14) + ' Do Not Disturb · notifications paused</div>' +
    '<div class="ring-wrap"><svg viewBox="0 0 180 180" width="200" height="200">' +
    '<circle cx="90" cy="90" r="78" class="ring-bg"/>' +
    '<circle id="ring-prog" cx="90" cy="90" r="78" class="ring-fg" transform="rotate(-90 90 90)" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + ringOffset() + '"/>' +
    '<text id="timer-time" x="90" y="98" text-anchor="middle" class="ring-text">' + fmt(timer.remaining) + '</text>' +
    '</svg></div>' +
    '<div class="focus-task">' + esc(it.title) + '</div>' +
    '<div class="firststep">First tiny step: just begin. Two minutes is enough.</div>' +
    '<div class="row gap8 focus-actions">' +
    '<button class="cta ghost grow" onclick="toggleFocusRun()">' + ic(timer.running ? 'pause' : 'play', 16) + ' ' + (timer.running ? 'Pause' : 'Resume') + '</button>' +
    '<button class="cta grow" onclick="finishFocus()">' + ic('check', 16) + ' Done</button></div>' +
    '</div>';
}
function toggleFocusRun() {
  if (timer.running) {
    // Pausing: capture the true remaining from the clock, then stop counting.
    timer.remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    timer.running = false;
  } else {
    // Resuming: re-anchor the end time to now + whatever's left.
    timer.endAt = Date.now() + timer.remaining * 1000;
    timer.running = true;
  }
  render();
}
function exitFocus() {
  const elapsed = Math.max(0, timer.total - timer.remaining);
  if (elapsed >= 20) {
    const it = Store.get().focus.find(x => x.id === timer.id);
    Store.logEvent({ t: 'focus', title: it ? it.title : '(unknown)', sec: elapsed, completed: false });
  }
  inFocus = false; stopTick(); view = 'today'; render();
}
function finishFocus() {
  const s = Store.get();
  const it = s.focus.find(x => x.id === timer.id);
  const elapsed = Math.max(0, timer.total - timer.remaining);
  Store.logEvent({ t: 'focus', title: it ? it.title : '(unknown)', sec: elapsed, completed: true });
  if (it && !it.done) {
    it.done = true; Store.touchMomentum();
    Store.logEvent({ t: 'done', title: it.title, list: 'focus', viaFocus: true });
  }
  Store.save(); inFocus = false; stopTick(); view = 'today'; render();
}
/* Do-Not-Disturb gate for any future reminder/nudge. */
function notify(msg) {
  if (inFocus || Store.get().onBreak) return false;
  toast(msg);
  return true;
}

/* ---------------- daily rhythm (habits) ----------------
   Forgiving by design: no resetting streaks ever — cumulative counts only.
   Missed days are invisible (never red, never a "you missed"). Rest days aren't misses.
   Habits persist across days (rollDay never touches them); today-done = log[todayStr]. */
const HABIT_ICONS = ['sprout', 'activity', 'dumbbell', 'book', 'droplet', 'pencil', 'heart', 'moon'];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];   // Mon=0 .. Sun=6
let habitDraft = null;   // {id?, title, icon, type, perWeek, days[]} while the sheet is open

function weekday0(dateStr) { return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7; } // Mon=0
function weekDates() {
  const t = Store.todayStr();
  const monday = new Date(t + 'T00:00:00');
  monday.setDate(monday.getDate() - weekday0(t));
  const out = [];
  for (let i = 0; i < 7; i++) { const x = new Date(monday); x.setDate(monday.getDate() + i); out.push(Store.todayStr(x)); }
  return out;
}
function habitDoneToday(h) { return !!(h.log && h.log[Store.todayStr()]); }
function habitMonthCount(h) {
  const pre = Store.todayStr().slice(0, 7);
  let n = 0; for (const k in (h.log || {})) if (k.indexOf(pre) === 0) n++;
  return n;
}
function habitWeekCount(h) {
  let n = 0; weekDates().forEach(function (d) { if (h.log && h.log[d]) n++; });
  return n;
}
function habitScheduledToday(h) {
  const c = h.cadence || { type: 'daily' };
  if (c.type === 'days') return (c.days || []).indexOf(weekday0(Store.todayStr())) !== -1;
  return true;   // daily + weekly are actionable any day
}
function suggestDaily(s) {
  const id = (s.identity || '').toLowerCase();
  if (id.indexOf('fit') >= 0) return 'Move 20 minutes';
  if (id.indexOf('read') >= 0) return 'Read 10 pages';
  if (id.indexOf('stud') >= 0) return 'Study 25 minutes';
  if (id.indexOf('work') >= 0) return 'Plan tomorrow tonight';
  return 'Move 20 minutes';
}

function renderRhythm(s) {
  const habits = s.habits || [];
  let html = '<section class="block"><div class="block-head"><h2 class="quiet">Daily rhythm</h2>' +
    '<span class="faint sm">never counts against you</span></div>';
  if (habits.length === 0) {
    html += '<div class="rhythm-empty"><p class="empty sm">Your everyday — small reps that vote for who you\'re becoming. Missing a day never sets you back.</p>' +
      '<button class="cta ghost" onclick="openHabitSheet()">' + ic('plus', 16) + ' Add a daily</button></div>';
    return html + '</section>';
  }
  html += '<div class="rhythm">' + habits.map(habitRow).join('') + '</div>';
  html += '<button class="rhythm-add" onclick="openHabitSheet()">' + ic('plus', 15) + ' Add a daily</button>';
  return html + '</section>';
}
function habitRow(h) {
  const c = h.cadence || { type: 'daily' };
  const done = habitDoneToday(h);
  let status, restDay = false;
  if (c.type === 'weekly') {
    const wc = habitWeekCount(h), goal = c.perWeek || 1;
    status = wc >= goal ? '<span class="hb-pill">Done for the week</span>'
      : '<span class="hb-meta">' + wc + '/' + goal + ' this week</span>';
  } else if (c.type === 'days' && !habitScheduledToday(h)) {
    restDay = true;
    status = '<span class="hb-meta">Rest day — enjoy it</span>';
  } else {
    const mc = habitMonthCount(h);
    status = (h.total || 0) === 0 ? '<span class="hb-meta">ready when you are</span>'
      : mc === 0 ? '<span class="hb-meta">fresh start</span>'
        : '<span class="hb-meta">' + mc + ' this month</span>';
  }
  const box = restDay
    ? '<span class="hb-chk rest" aria-hidden="true"></span>'
    : '<button class="hb-chk' + (done ? ' on' : '') + '" aria-label="' + (done ? 'Done' : 'Mark done') +
    '" onclick="event.stopPropagation();toggleHabit(\'' + h.id + '\')">' + (done ? ic('check', 13) : '') + '</button>';
  return '<div class="hb-row' + (done ? ' done' : '') + (restDay ? ' rest' : '') + '">' +
    box + '<span class="hb-ic">' + ic(h.icon || 'sprout', 17) + '</span>' +
    '<span class="grow hb-title">' + esc(h.title) + '</span>' + status +
    '<button class="iconbtn faint hb-edit" aria-label="Edit daily" onclick="openHabitSheet(\'' + h.id + '\')">' + ic('pencil', 15) + '</button>' +
    '</div>';
}
function toggleHabit(id) {
  const s = Store.get();
  const h = (s.habits || []).find(x => x.id === id);
  if (!h) return;
  if (!h.log) h.log = {};
  const t = Store.todayStr();
  if (h.log[t]) {
    delete h.log[t];
    if (h.total > 0) h.total--;
  } else {
    h.log[t] = 1; h.total = (h.total || 0) + 1;
    Store.touchMomentum();
    Store.logEvent({ t: 'habit', id: h.id, title: h.title });
    const keys = Object.keys(h.log);
    if (keys.length > 140) { keys.sort(); keys.slice(0, keys.length - 140).forEach(k => delete h.log[k]); }
  }
  Store.save(); render();
}

/* add / edit sheet (re-renders itself on each change, like the focus picker) */
function openHabitSheet(id) {
  const s = Store.get();
  if (id) {
    const h = (s.habits || []).find(x => x.id === id);
    if (!h) return;
    const c = h.cadence || { type: 'daily' };
    habitDraft = { id: h.id, title: h.title, icon: h.icon || 'sprout', type: c.type || 'daily', perWeek: c.perWeek || 3, days: (c.days || [0, 2, 4]).slice() };
  } else {
    const seed = (s.habits || []).length === 0 ? suggestDaily(s) : '';
    habitDraft = { id: null, title: seed, icon: 'sprout', type: 'daily', perWeek: 3, days: [0, 2, 4] };
  }
  showHabitSheet();
}
function showHabitSheet() {
  const d = habitDraft; if (!d) return;
  const icons = HABIT_ICONS.map(n =>
    '<button class="hb-icon' + (d.icon === n ? ' sel' : '') + '" aria-label="icon" onclick="habitPickIcon(\'' + n + '\')">' + ic(n, 18) + '</button>').join('');
  const days = DAY_LABELS.map((lb, i) =>
    '<button class="hb-day' + (d.days.indexOf(i) !== -1 ? ' sel' : '') + '" onclick="habitToggleDay(' + i + ')">' + lb + '</button>').join('');
  const stepper = '<div class="hb-stepwrap"><span class="faint sm">How many times a week?</span>' +
    '<span class="hb-step">' +
    '<button class="hb-stepbtn" onclick="habitStep(-1)" aria-label="Fewer">−</button>' +
    '<b>' + d.perWeek + '×</b>' +
    '<button class="hb-stepbtn" onclick="habitStep(1)" aria-label="More">+</button></span></div>';
  const opt = (type, label) =>
    '<button class="hb-opt' + (d.type === type ? ' sel' : '') + '" onclick="habitPickType(\'' + type + '\')">' +
    ic(d.type === type ? 'check' : 'square', 16) + '<span class="grow">' + label + '</span></button>';
  overlay.innerHTML =
    '<div class="sheet-bg" onclick="closeHabitSheet()"></div>' +
    '<div class="sheet"><div class="sheet-grip"></div>' +
    '<h3>' + (d.id ? 'Edit daily' : 'New daily') + '</h3>' +
    '<div class="hb-titlerow">' + ic(d.icon, 18) +
    '<input id="hb-title" placeholder="e.g. Move 20 minutes" value="' + esc(d.title) + '" oninput="habitDraft.title=this.value" onkeydown="if(event.key===\'Enter\')saveHabit()" /></div>' +
    '<div class="hb-icons">' + icons + '</div>' +
    '<div class="dur-label">How often?</div>' +
    '<div class="hb-opts">' + opt('daily', 'Every day') + opt('weekly', 'A few times a week') + opt('days', 'Specific days') + '</div>' +
    (d.type === 'weekly' ? stepper : '') +
    (d.type === 'days' ? '<div class="hb-days">' + days + '</div>' : '') +
    '<button class="cta grow mt12" onclick="saveHabit()">' + ic('check', 16) + ' Save</button>' +
    (d.id ? '<button class="ghost danger" onclick="deleteHabit()">Delete this daily</button>' : '') +
    '</div>';
  overlay.classList.add('show');
}
function habitSyncTitle() { const el = document.getElementById('hb-title'); if (el) habitDraft.title = el.value; }
function habitPickIcon(n) { habitSyncTitle(); habitDraft.icon = n; showHabitSheet(); }
function habitPickType(t) { habitSyncTitle(); habitDraft.type = t; showHabitSheet(); }
function habitToggleDay(i) { habitSyncTitle(); const k = habitDraft.days.indexOf(i); if (k === -1) habitDraft.days.push(i); else habitDraft.days.splice(k, 1); showHabitSheet(); }
function habitStep(n) { habitSyncTitle(); habitDraft.perWeek = Math.max(1, Math.min(7, habitDraft.perWeek + n)); showHabitSheet(); }
function closeHabitSheet() { overlay.classList.remove('show'); overlay.innerHTML = ''; habitDraft = null; }
function saveHabit() {
  habitSyncTitle();
  const d = habitDraft; if (!d) return;
  const title = (d.title || '').trim();
  if (!title) { toast('Give your daily a name.'); return; }
  if (d.type === 'days' && d.days.length === 0) { toast('Pick at least one day — or choose Every day.'); return; }
  const cadence = d.type === 'weekly' ? { type: 'weekly', perWeek: d.perWeek }
    : d.type === 'days' ? { type: 'days', days: d.days.slice().sort((a, b) => a - b) }
      : { type: 'daily' };
  const s = Store.get();
  if (d.id) {
    const h = s.habits.find(x => x.id === d.id);
    if (h) { h.title = title; h.icon = d.icon; h.cadence = cadence; }
  } else {
    s.habits.push({ id: Store.uid(), title: title, icon: d.icon, cadence: cadence, log: {}, total: 0, created: Store.todayStr() });
  }
  Store.save(); closeHabitSheet(); render();
  toast(d.id ? 'Updated.' : 'Added to your rhythm.');
}
function deleteHabit() {
  const d = habitDraft; if (!d || !d.id) return;
  if (!confirm('Remove this daily? Letting go is a win, not a failure.')) return;
  const s = Store.get();
  s.habits = s.habits.filter(x => x.id !== d.id);
  Store.save(); closeHabitSheet(); render();
  toast('Let go — one less thing to carry.');
}

/* You-tab stats panel — wins shown gently (filled = did it), never a red "miss". */
function habitLast7(h) {
  const out = [], today = new Date(Store.todayStr() + 'T00:00:00');
  for (let i = 6; i >= 0; i--) {
    const x = new Date(today); x.setDate(today.getDate() - i);
    const ds = Store.todayStr(x);
    const rest = (h.cadence && h.cadence.type === 'days') && (h.cadence.days || []).indexOf((x.getDay() + 6) % 7) === -1;
    out.push({ done: !!(h.log && h.log[ds]), rest: rest, today: i === 0 });
  }
  return out;
}
function habitStatRow(h) {
  const c = h.cadence || { type: 'daily' };
  const cadLabel = c.type === 'weekly' ? (c.perWeek || 1) + '× a week' : c.type === 'days' ? 'set days' : 'every day';
  const headline = c.type === 'weekly' ? habitWeekCount(h) + '/' + (c.perWeek || 1) + ' this week' : habitMonthCount(h) + ' this month';
  const dots = habitLast7(h).map(d =>
    '<span class="dot' + (d.rest ? ' rest' : d.done ? ' on' : '') + (d.today ? ' today' : '') + '"></span>').join('');
  return '<div class="hstat">' +
    '<div class="hstat-top"><span class="hb-ic">' + ic(h.icon || 'sprout', 16) + '</span>' +
    '<span class="grow hstat-title">' + esc(h.title) + '</span>' +
    '<span class="hb-meta">' + (h.total || 0) + ' all-time</span></div>' +
    '<div class="hstat-sub"><span class="faint sm">' + cadLabel + ' · ' + headline + '</span>' +
    '<span class="dots">' + dots + '</span></div></div>';
}
function renderRhythmStats(s) {
  const habits = s.habits || [];
  if (!habits.length) return '';
  const reps = habits.reduce((a, h) => a + (h.total || 0), 0);
  return '<section class="block"><div class="block-head"><h2 class="quiet">Your dailies</h2>' +
    '<span class="faint sm">' + reps + ' rep' + (reps === 1 ? '' : 's') + ' all-time · no misses counted</span></div>' +
    '<div class="rhythm">' + habits.map(habitStatRow).join('') + '</div></section>';
}

/* ---------------- priorities (Eisenhower) ---------------- */
function renderPriorities() {
  const s = Store.get();
  let html = '<header class="head"><div><h1>Priorities</h1>' +
    '<div class="muted sm">sorted by what to actually do</div></div></header>';

  const order = ['do', 'plan', 'quick', 'letgo'];
  const active = s.priorities.filter(p => !p.done);
  if (active.length === 0) {
    html += '<p class="empty">Nothing here yet. Add what matters — we\'ll ask if it\'s important and urgent, then sort it for you.</p>';
  } else {
    order.forEach(function (k) {
      const L = LANES[k];
      const items = active.filter(p => laneOf(p) === k);
      if (!items.length) return;
      html += '<div class="lane"><div class="lh" style="background:' + L.bg + ';color:' + L.fg + '">' +
        ic(L.icon, 16) + ' ' + L.name + '<span class="lcnt">' + L.desc + '</span></div>' +
        items.map(p => prow(k, p)).join('') + '</div>';
    });
  }

  html += '<div class="padd">' +
    '<input id="pri-title" placeholder="Add a priority…" onkeydown="if(event.key===\'Enter\')addPriority()" />' +
    '<p class="faint sm padd-hint">Tap if it\'s important and/or urgent — we\'ll sort it for you.</p>' +
    '<div class="prow-toggles">' +
    '<button class="ptoggle on" data-k="important" onclick="this.classList.toggle(\'on\')">Important</button>' +
    '<button class="ptoggle" data-k="urgent" onclick="this.classList.toggle(\'on\')">Urgent</button>' +
    '<button class="add wide" onclick="addPriority()">' + ic('plus', 16) + ' Add</button>' +
    '</div></div>';
  html += '<p class="footnote">Promote your top 1–3 into Today.</p>';
  return html;
}
function prow(k, p) {
  const L = LANES[k];
  let action;
  if (k === 'do' || k === 'plan') action = '<button class="pact" style="background:' + L.act + '" onclick="promoteToFocus(\'' + p.id + '\')">→ Today</button>';
  else if (k === 'quick') action = '<button class="pact" style="background:' + L.act + '" onclick="priorityToBonus(\'' + p.id + '\')">→ Bonus</button>';
  else action = '<button class="pact" style="background:' + L.act + '" onclick="removePriority(\'' + p.id + '\',true)">Let go</button>';
  const rm = (k === 'letgo') ? '' :
    '<button class="iconbtn faint" aria-label="Remove" onclick="removePriority(\'' + p.id + '\')">' + ic('x', 15) + '</button>';
  return '<div class="prow">' +
    '<button class="chk sm" aria-label="Complete" onclick="completePriority(\'' + p.id + '\')">' + ic('check', 13) + '</button>' +
    '<span class="grow">' + esc(p.title) + '</span>' + action + rm + '</div>';
}
function addPriority() {
  const el = document.getElementById('pri-title');
  const t = el && el.value.trim();
  if (!t) return;
  const impEl = document.querySelector('.ptoggle[data-k="important"]');
  const urgEl = document.querySelector('.ptoggle[data-k="urgent"]');
  const important = impEl ? impEl.classList.contains('on') : true;
  const urgent = urgEl ? urgEl.classList.contains('on') : false;
  Store.get().priorities.push({ id: Store.uid(), title: t, important: important, urgent: urgent, done: false });
  Store.save(); render();
}
function completePriority(id) {
  const s = Store.get();
  const p = s.priorities.find(x => x.id === id);
  if (!p) return;
  s.priorities = s.priorities.filter(x => x.id !== id);
  Store.touchMomentum();
  Store.logEvent({ t: 'done', title: p.title, list: 'priority', viaFocus: false });
  Store.save(); render(); toast('Nice — done.');
}
function promoteToFocus(id) {
  const s = Store.get();
  const p = s.priorities.find(x => x.id === id);
  if (!p) return;
  if (s.focus.length >= 3) { toast('Focus is full — finish or make room first.'); return; }
  s.priorities = s.priorities.filter(x => x.id !== id);
  s.focus.push({ id: Store.uid(), title: p.title, done: false });
  Store.save(); render(); toast('On today\'s focus.');
}
function priorityToBonus(id) {
  const s = Store.get();
  const p = s.priorities.find(x => x.id === id);
  if (!p) return;
  s.priorities = s.priorities.filter(x => x.id !== id);
  s.bonus.push({ id: Store.uid(), title: p.title, done: false });
  Store.save(); render(); toast('Sent to Bonus.');
}
function removePriority(id, letGo) {
  const s = Store.get();
  s.priorities = s.priorities.filter(x => x.id !== id);
  Store.save(); render();
  toast(letGo ? 'Let go — that\'s a win.' : 'Removed.');
}

/* ---------------- notes ---------------- */
function renderNotes() {
  const s = Store.get();
  let html = '<header class="head"><h1>Notes</h1></header>';

  const daily = s.notes.find(n => n.day === Store.todayStr());
  const dprev = (daily && daily.body.trim()) ? esc(daily.body.trim().replace(/\n/g, ' ').slice(0, 80)) : 'Start today\'s note…';
  html += '<button class="ndaily" onclick="openDailyNote()">' +
    '<div class="ndaily-h">' + ic('note', 15) + ' Today\'s note · ' + esc(prettyDate()) + '</div>' +
    '<div class="ndaily-p">' + dprev + '</div></button>';

  const notes = s.notes.filter(n => !n.day).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  html += '<div class="block-head"><h2 class="quiet">All notes</h2></div>';
  if (!notes.length) {
    html += '<p class="empty sm">No notes yet. Capture a thought that isn\'t a task.</p>';
  } else {
    html += notes.map(function (n) {
      const title = (n.title && n.title.trim()) || 'Untitled';
      const prev = n.body.trim() ? esc(n.body.trim().replace(/\n/g, ' ').slice(0, 80)) : 'Empty';
      return '<button class="ncard" onclick="openNote(\'' + n.id + '\')">' +
        '<div class="ntitle">' + esc(title) + '</div>' +
        '<div class="nprev">' + prev + '</div>' +
        '<div class="ntime">' + relTime(n.updated) + '</div></button>';
    }).join('');
  }
  html += '<button class="cta ghost" style="margin-top:12px" onclick="newNote()">' + ic('plus', 16) + ' New note</button>';
  return html;
}
function openNote(id) { currentNoteId = id; noteActiveLine = 0; view = 'note'; render(); }
function openDailyNote() {
  const s = Store.get();
  let n = s.notes.find(x => x.day === Store.todayStr());
  if (!n) {
    n = { id: Store.uid(), title: '', body: '', day: Store.todayStr(), updated: Date.now() };
    s.notes.push(n); Store.save();
  }
  currentNoteId = n.id; noteActiveLine = 0; view = 'note'; render();
}
function newNote() {
  const s = Store.get();
  const n = { id: Store.uid(), title: '', body: '', day: '', updated: Date.now() };
  s.notes.push(n); Store.save();
  currentNoteId = n.id; noteActiveLine = 0; view = 'note'; render();
}
function renderNote() {
  const s = Store.get();
  const n = s.notes.find(x => x.id === currentNoteId);
  if (!n) { view = 'notes'; return renderNotes(); }
  const isDaily = !!n.day;
  const titleField = isDaily
    ? '<div class="note-dtitle">' + ic('note', 17) + ' Today\'s note · ' + esc(prettyDate()) + '</div>'
    : '<input id="note-title" class="note-title" placeholder="Title" value="' + esc(n.title) + '" oninput="saveNote()" />';
  return '<div class="noteedit">' +
    '<div class="note-bar">' +
    '<button class="iconbtn" aria-label="Back" onclick="closeNote()">' + ic('back', 22) + '</button>' +
    '<button class="iconbtn faint" aria-label="Delete note" onclick="deleteNote()">' + ic('trash', 19) + '</button>' +
    '</div>' +
    titleField +
    '<div class="note-tools">' +
    '<button class="ntool" onclick="lineToFocus()">' + ic('sun', 15) + ' Today</button>' +
    '<button class="ntool" onclick="lineToPriority()">' + ic('listCheck', 15) + ' Priority</button>' +
    '<button class="ntool" onclick="toggleChecklist()">' + ic('square', 15) + ' Checklist</button>' +
    '</div>' +
    '<div id="note-lines" class="note-lines">' + renderNoteLines(n.body) + '</div>' +
    '</div>';
}
function saveNote() {
  const s = Store.get();
  const n = s.notes.find(x => x.id === currentNoteId);
  if (!n) return;
  const tEl = document.getElementById('note-title');
  if (tEl) n.title = tEl.value;
  const body = serializeNoteLines();
  if (body !== null) n.body = body;
  n.updated = Date.now();
  Store.save();
}
function noteLeaveCleanup() {
  saveNote();
  const s = Store.get();
  const n = s.notes.find(x => x.id === currentNoteId);
  if (n && !(n.title && n.title.trim()) && !(n.body && n.body.trim())) {
    s.notes = s.notes.filter(x => x.id !== currentNoteId);
    Store.save();
  }
  currentNoteId = null;
}
function closeNote() { go('notes'); }
function deleteNote() {
  if (!confirm('Delete this note?')) return;
  const s = Store.get();
  s.notes = s.notes.filter(x => x.id !== currentNoteId);
  Store.save();
  currentNoteId = null; view = 'notes'; render(); toast('Note deleted.');
}
/* --- inline line editor: real tappable checkboxes · Enter = new line · Backspace = merge --- */
let noteActiveLine = 0;
const NOTE_CHECK_RE = /^\[([ xX])\]\s?(.*)$/;
function renderNoteLines(body) {
  let lines = (body || '').split('\n');
  if (!lines.length) lines = [''];
  return lines.map(noteLineHTML).join('');
}
function noteLineHTML(ln, i) {
  const m = ln.match(NOTE_CHECK_RE);
  if (m) {
    const on = m[1].toLowerCase() === 'x';
    return '<div class="nl check' + (on ? ' done' : '') + '" data-i="' + i + '">' +
      '<button class="nl-box' + (on ? ' on' : '') + '" aria-label="Toggle item" onclick="noteToggleBox(' + i + ')">' + (on ? ic('check', 12) : '') + '</button>' +
      '<textarea rows="1" class="nl-in" data-i="' + i + '" oninput="noteLineInput(this)" onkeydown="noteLineKey(event,' + i + ')" onfocus="noteActiveLine=' + i + '">' + esc(m[2]) + '</textarea></div>';
  }
  return '<div class="nl" data-i="' + i + '">' +
    '<textarea rows="1" class="nl-in" data-i="' + i + '"' + (i === 0 ? ' placeholder="Write anything… ⏎ for a new line"' : '') +
    ' oninput="noteLineInput(this)" onkeydown="noteLineKey(event,' + i + ')" onfocus="noteActiveLine=' + i + '">' + esc(ln) + '</textarea></div>';
}
function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
function serializeNoteLines() {
  const cont = document.getElementById('note-lines');
  if (!cont) return null;
  const out = [];
  cont.querySelectorAll('.nl').forEach(function (r) {
    const ta = r.querySelector('.nl-in');
    const txt = ta ? ta.value : '';
    out.push(r.classList.contains('check') ? ((r.classList.contains('done') ? '[x] ' : '[ ] ') + txt) : txt);
  });
  return out.join('\n');
}
function noteLineInput(ta) {
  if (ta.value.indexOf('\n') >= 0) ta.value = ta.value.replace(/\n+/g, ' ');
  autoGrow(ta);
  saveNote();
}
function noteBodyLines() { const n = Store.get().notes.find(x => x.id === currentNoteId); return n ? (n.body || '').split('\n') : ['']; }
function setNoteBody(lines) {
  const n = Store.get().notes.find(x => x.id === currentNoteId);
  if (n) { n.body = lines.join('\n'); n.updated = Date.now(); Store.save(); }
}
function lineText(ln) { const m = ln.match(NOTE_CHECK_RE); return m ? m[2] : ln; }
function linePrefix(ln) { const m = ln.match(NOTE_CHECK_RE); return m ? (m[1].toLowerCase() === 'x' ? '[x] ' : '[ ] ') : ''; }
function rerenderNoteLines(focusIdx, caretPos) {
  const cont = document.getElementById('note-lines');
  const n = Store.get().notes.find(x => x.id === currentNoteId);
  if (!cont || !n) return;
  cont.innerHTML = renderNoteLines(n.body);
  cont.querySelectorAll('.nl-in').forEach(autoGrow);
  if (focusIdx != null) {
    const el = cont.querySelector('.nl-in[data-i="' + focusIdx + '"]');
    if (el) { el.focus(); const p = caretPos == null ? el.value.length : caretPos; try { el.setSelectionRange(p, p); } catch (e) {} noteActiveLine = focusIdx; }
  }
}
function noteLineKey(e, i) {
  const ta = e.target;
  if (e.key === 'Enter') {
    e.preventDefault();
    saveNote();
    const lines = noteBodyLines();
    const caret = ta.selectionStart;
    const before = ta.value.slice(0, caret), after = ta.value.slice(caret);
    const pre = linePrefix(lines[i] || '');
    lines[i] = pre + before;
    lines.splice(i + 1, 0, pre + after);   // a new line inherits checklist-ness
    setNoteBody(lines);
    rerenderNoteLines(i + 1, 0);
  } else if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0 && i > 0) {
    e.preventDefault();
    saveNote();
    const lines = noteBodyLines();
    const prevText = lineText(lines[i - 1]);
    const mergePos = prevText.length;
    lines[i - 1] = linePrefix(lines[i - 1]) + prevText + lineText(lines[i]);
    lines.splice(i, 1);
    setNoteBody(lines);
    rerenderNoteLines(i - 1, mergePos);
  }
}
function noteToggleBox(i) {
  saveNote();
  const lines = noteBodyLines();
  const m = lines[i] && lines[i].match(NOTE_CHECK_RE);
  if (!m) return;
  lines[i] = (m[1].toLowerCase() === 'x' ? '[ ] ' : '[x] ') + m[2];
  setNoteBody(lines);
  rerenderNoteLines(null);
}
function toggleChecklist() {
  saveNote();
  const lines = noteBodyLines();
  let i = noteActiveLine; if (i == null || i < 0 || i >= lines.length) i = lines.length - 1;
  const m = lines[i].match(NOTE_CHECK_RE);
  lines[i] = m ? m[2] : ('[ ] ' + lines[i]);
  setNoteBody(lines);
  rerenderNoteLines(i, null);
}
function addToFocusOrBonus(text) {
  const s = Store.get();
  if (s.focus.length < 3) {
    s.focus.push({ id: Store.uid(), title: text, done: false });
    Store.save(); toast('Sent to Today\'s focus.');
  } else {
    s.bonus.push({ id: Store.uid(), title: text, done: false });
    Store.save(); toast('Focus was full — sent to Bonus.');
  }
}
function activeLineText() {
  const lines = noteBodyLines();
  let i = noteActiveLine; if (i == null || i < 0 || i >= lines.length) return '';
  return lineText(lines[i]).trim();
}
function lineToFocus() {
  const text = activeLineText();
  if (!text) { toast('Tap a line with text first.'); return; }
  addToFocusOrBonus(text);
}
function lineToPriority() {
  const text = activeLineText();
  if (!text) { toast('Tap a line with text first.'); return; }
  Store.get().priorities.push({ id: Store.uid(), title: text, important: true, urgent: false, done: false });
  Store.save(); toast('Added to Priorities · Plan.');
}

/* ---------------- you ---------------- */
function renderYou() {
  const s = Store.get();
  let html = '<header class="head"><h1>You</h1></header>';

  html += '<div class="card profile">' +
    '<div class="avatar">' + esc((s.name && s.name.trim() ? s.name.trim().charAt(0) : '·').toUpperCase()) + '</div>' +
    '<div class="grow"><div class="pname">' + esc(s.name || 'Friend') + '</div>' +
    '<div class="muted sm">working toward ' + esc(s.identity) + '</div></div>' +
    '<button class="link" onclick="editProfile()">Edit</button></div>';

  html += '<div class="card stat"><div class="muted sm">Momentum</div>' +
    '<div class="stat-big teal">' + s.momentum + '<span class="sm"> ' + (s.momentum === 1 ? 'day' : 'days') + '</span></div>' +
    '<div class="faint sm">a gap never resets it</div></div>';

  const ins = computeInsights();
  html += '<section class="block"><div class="block-head"><h2 class="quiet">Your rhythm</h2>' +
    '<span class="faint sm">your v2 brain, forming</span></div>' +
    '<div class="stats3">' +
    statCard('Things done', ins.done) +
    statCard('Focused', fmtMin(ins.focusedMin)) +
    statCard('Days won', ins.daysWon) +
    '</div>';
  if (ins.done >= 3 && ins.sharpestHour != null) {
    html += '<div class="insight">' + ic('sprout', 16) + '<span>You get the most done around <b>' + hourLabel(ins.sharpestHour) + '</b>.</span></div>';
  } else {
    html += '<p class="faint sm" style="margin:10px 2px 0">Patterns show up after a few days — the more you use it, the smarter your plan gets.</p>';
  }
  html += '</section>';

  html += renderRhythmStats(s);

  html += '<section class="block"><div class="block-head"><h2 class="quiet">Parked</h2>' +
    '<span class="faint sm">no rush, ever</span></div>';
  if (s.parked.length === 0) {
    html += '<p class="empty sm">Nothing parked. You\'re all caught up — by definition.</p>';
  } else {
    html += s.parked.map(i =>
      '<div class="bonusrow"><span class="grow">' + esc(i.title) + '</span>' +
      '<button class="link" onclick="restore(\'' + i.id + '\')">Bring back</button>' +
      '<button class="iconbtn faint" aria-label="Let go" onclick="forget(\'' + i.id + '\')">' + ic('x', 15) + '</button></div>'
    ).join('');
  }
  html += '</section>';

  html += '<button class="card breakbtn" onclick="toggleBreak()">' + ic('coffee', 20) +
    '<div class="grow"><b>' + (s.onBreak ? 'You\'re on a break' : 'Take a break') + '</b>' +
    '<div class="sm muted">' + (s.onBreak ? 'Rest as long as you like. Tap to come back.' : 'Pause guilt-free. Nothing piles up.') + '</div></div></button>';

  html += renderRunwaySetting(s);

  html += '<section class="block"><div class="block-head"><h2 class="quiet">Your data</h2>' +
    '<span class="faint sm">yours, always</span></div>' +
    '<div class="row gap8">' +
    '<button class="cta ghost grow" onclick="exportData()">Back up</button>' +
    '<button class="cta ghost grow" onclick="importData()">Restore</button></div>' +
    '<p class="faint sm" style="margin:10px 2px 0">Saves a JSON file with everything — including the quiet history that powers future features. Stored only on this device.</p></section>';

  html += '<button class="ghost danger" onclick="confirmReset()">Reset everything</button>';
  html += '<p class="footnote">Cadence v1 · made to be kind.' + (self.CADENCE_VERSION ? ' · ' + self.CADENCE_VERSION : '') + '</p>';
  return html;
}
function restore(id) {
  const s = Store.get();
  const it = s.parked.find(x => x.id === id);
  if (!it) return;
  s.parked = s.parked.filter(x => x.id !== id);
  if (s.focus.length < 3) s.focus.push({ id: Store.uid(), title: it.title, done: false });
  else s.bonus.push({ id: Store.uid(), title: it.title, done: false });
  Store.save(); render();
  toast('Back on today\'s list.');
}
function forget(id) {
  const s = Store.get();
  s.parked = s.parked.filter(x => x.id !== id);
  Store.save(); render();
  toast('Let go. That\'s a win too.');
}
function toggleBreak() { const s = Store.get(); Store.set({ onBreak: !s.onBreak }); render(); }
function renderRunwaySetting(s) {
  const on = !!s.windDownTime;
  return '<section class="block"><div class="block-head"><h2 class="quiet">Day\'s runway</h2>' +
    '<span class="faint sm">a calm time-left — off or on</span></div>' +
    '<div class="card">' +
    '<div class="row gap8" style="flex-wrap:wrap">' +
    '<span class="addmeta-lab">' + ic('sun', 14) + ' Bedtime</span>' +
    '<input id="set-wind" type="time" value="' + (s.windDownTime || '') + '" />' +
    '<button class="add" onclick="saveWind()">Save</button>' +
    (on ? '<button class="link" onclick="clearWind()">Turn off</button>' : '') +
    '</div>' +
    '<p class="faint sm" style="margin:10px 2px 0">' + (on
      ? 'Showing time left until ' + fmtTime(s.windDownTime) + ' on Today. Change anytime, or turn it off.'
      : 'Off. Set a time to see a gentle “time left today” on Today — never a guilt countdown.') + '</p>' +
    '</div></section>';
}
function saveWind() {
  const el = document.getElementById('set-wind');
  const v = el && el.value;
  if (!v) { toast('Pick a time first — or leave it off.'); return; }
  Store.set({ windDownTime: v }); render();
  toast('Runway set to ' + fmtTime(v) + '.');
}
function clearWind() { Store.set({ windDownTime: null }); render(); toast('Runway off — your call, always.'); }

function computeInsights() {
  const h = Store.get().history || [];
  let done = 0, focusedSec = 0, daysWon = 0, sharpestHour = null, max = 0;
  const hours = {};
  h.forEach(function (e) {
    if (e.t === 'done') { done++; hours[e.hour] = (hours[e.hour] || 0) + 1; }
    else if (e.t === 'focus') { focusedSec += (e.sec || 0); }
    else if (e.t === 'day' && e.won) { daysWon++; }
  });
  Object.keys(hours).forEach(function (k) { if (hours[k] > max) { max = hours[k]; sharpestHour = parseInt(k, 10); } });
  return { done: done, focusedMin: Math.round(focusedSec / 60), daysWon: daysWon, sharpestHour: sharpestHour };
}
function hourLabel(h) {
  if (h == null) return '—';
  const ampm = h < 12 ? 'am' : 'pm';
  const hr = (h % 12) || 12;
  return hr + ' ' + ampm;
}
function fmtMin(m) {
  if (!m) return '0m';
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}
function statCard(label, val) {
  return '<div class="scard"><div class="faint sm">' + label + '</div><div class="scard-v">' + val + '</div></div>';
}
function editProfile() {
  const s = Store.get();
  const goalVal = s.identity === 'getting better' ? '' : s.identity;
  overlay.innerHTML =
    '<div class="sheet-bg" onclick="closeProfileSheet()"></div>' +
    '<div class="sheet"><div class="sheet-grip"></div>' +
    '<h3>Your profile</h3>' +
    '<label class="pf-lab">What should I call you? <span class="faint">(optional)</span></label>' +
    '<input id="pf-name" class="pf-in" placeholder="Your name" value="' + esc(s.name) + '" />' +
    '<label class="pf-lab">What are you working toward? <span class="faint">(optional)</span></label>' +
    '<input id="pf-goal" class="pf-in" placeholder="e.g. getting fit" value="' + esc(goalVal) + '" onkeydown="if(event.key===\'Enter\')saveProfile()" />' +
    '<button class="cta grow mt12" onclick="saveProfile()">Save</button>' +
    '</div>';
  overlay.classList.add('show');
  setTimeout(() => { const el = document.getElementById('pf-name'); if (el) el.focus(); }, 50);
}
function saveProfile() {
  const nmEl = document.getElementById('pf-name');
  const glEl = document.getElementById('pf-goal');
  const name = nmEl ? nmEl.value.trim() : '';
  const goal = glEl ? glEl.value.trim() : '';
  Store.set({ name: name, identity: goal || 'getting better' });
  closeProfileSheet(); render(); toast('Saved.');
}
function closeProfileSheet() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
function confirmReset() {
  if (confirm('Reset all your data and start fresh? This can\'t be undone.')) {
    Store.reset(); comeback = null; view = 'onboard'; onbStep = 1; render();
  }
}

function exportData() {
  const data = JSON.stringify(Store.get(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cadence-backup-' + Store.todayStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backed up. Keep the file somewhere safe.');
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = function () {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      let obj;
      try { obj = JSON.parse(reader.result); }
      catch (e) { toast('Couldn\'t read that file.'); return; }
      if (!obj || typeof obj !== 'object' || !('momentum' in obj)) {
        toast('That doesn\'t look like a Cadence backup.'); return;
      }
      if (confirm('Restore from this backup? It replaces what\'s on this device.')) {
        Store.replaceAll(obj); comeback = null;
        view = Store.get().onboarded ? 'today' : 'onboard'; onbStep = 1; render();
        toast('Restored.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------------- service worker ---------------- */
function registerSW() {
  console.log('Cadence ' + (self.CADENCE_VERSION || 'dev'));
  if (!('serviceWorker' in navigator)) return;
  // updateViaCache:'none' → the browser bypasses the HTTP cache when checking sw.js for updates.
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* offline still fine */ });
  // When a freshly deployed SW takes control, reload once to pick up new assets.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  // Re-check for a new version each time the app regains focus (covers a reopened installed PWA).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((r) => { if (r) r.update(); });
    }
  });
}

// Keep the focus countdown honest after the screen was off/locked: recompute from the wall clock
// the moment the page becomes visible again, rather than waiting for the next 1s heartbeat.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { syncTimer(); refreshRunway(); }
});
// Keep the day's-runway readout honest while the app sits idle (wall-clock, same lesson as the timer).
setInterval(refreshRunway, 60000);

init();
