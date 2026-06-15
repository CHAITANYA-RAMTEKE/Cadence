/* Cadence — UI + interactions. Vanilla JS, no build step. */

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');

let view = 'today';           // 'onboard' | 'today' | 'you' | 'focus'
let onbStep = 1;
let ob = { persona: '', identity: 'getting better', sugg: '20-minute walk' };
let comeback = null;          // {gap, parkedCount} after a break
let timer = { id: null, total: 25 * 60, remaining: 25 * 60, handle: null, running: false };

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
  party: '<path d="M4 20l5-13 9 9z"/><path d="M14 6c1-1 3-1 4 0M16 3v2M20 7h2M19 10l1 1"/>'
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
  else app.innerHTML = renderShell(view === 'you' ? renderYou() : renderToday());
  app.scrollTop = 0;
}

function renderShell(inner) {
  return '<div class="screen">' + inner + '</div>' + renderNav();
}
function renderNav() {
  const tab = (v, name, label) =>
    '<button class="navbtn ' + (view === v ? 'on' : '') + '" onclick="go(\'' + v + '\')">' +
    ic(name, 22) + '<span>' + label + '</span></button>';
  return '<nav class="nav">' +
    tab('today', 'sun', 'Today') +
    '<button class="fab" aria-label="Add" onclick="openCapture()">' + ic('plus', 24) + '</button>' +
    tab('you', 'user', 'You') +
    '</nav>';
}
function go(v) { view = v; render(); }

/* ---------------- onboarding ---------------- */
function renderOnboard() {
  const dots = [1, 2, 3, 4, 5].map(n =>
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
    const chip = (label, val) =>
      '<button class="chip" onclick="obPersona(\'' + val + '\')">' + label + '</button>';
    body =
      '<div class="ob">' +
      '<h2>What brings you here?</h2><p class="muted sm">No wrong answer — it just tunes the wording.</p>' +
      chip('Studying', 'student') + chip('Working', 'working') +
      chip('Building better habits', 'habits') + chip('A bit of everything', 'all') +
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
  } else {
    body =
      '<div class="ob">' +
      '<h2>What\'s one thing for today?</h2><p class="muted sm">Just one is plenty to start.</p>' +
      '<input id="ob-first" value="' + esc(ob.sugg) + '" />' +
      '<div class="vote">' + ic('heart', 16) + ' A vote for <b>' + esc(ob.identity) + '</b></div>' +
      '<button class="cta" onclick="obFinish()">Add &amp; see my day</button></div>';
  }
  return '<div class="onboard">' + (onbStep < 6 ? '<div class="dots">' + dots + '</div>' : '') + body + '</div>';
}
function obNext(n) { onbStep = n; render(); }
function obPersona(p) { ob.persona = p; onbStep = 3; render(); }
function obIdentity(id, sugg) { ob.identity = id; ob.sugg = sugg; onbStep = 4; render(); }
function obFinish() {
  const el = document.getElementById('ob-first');
  const first = el && el.value.trim();
  const t = Store.todayStr();
  Store.set({
    onboarded: true, identity: ob.identity || 'getting better', persona: ob.persona,
    momentum: 1, lastMomentumDate: t, currentDate: t, lastActiveDate: t,
    focus: first ? [{ id: Store.uid(), title: first, done: false }] : []
  });
  view = 'today'; render();
  toast('You\'re set. Today\'s already a win waiting to happen.');
}

/* ---------------- today ---------------- */
function renderToday() {
  const s = Store.get();
  const allDone = s.focus.length > 0 && s.focus.every(i => i.done);
  let html = '';

  html +=
    '<header class="head"><div>' +
    '<div class="muted sm">' + esc(prettyDate()) + '</div>' +
    '<h1>' + greeting() + '</h1></div>' +
    '<span class="pill">' + ic('sprout', 14) + ' Day ' + s.momentum + '</span></header>';

  if (comeback) {
    html +=
      '<div class="banner soft">' +
      '<div><b>Welcome back — it\'s a clean page.</b>' +
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

  html += '<section class="block"><div class="block-head"><h2>Today\'s focus</h2>' +
    '<span class="faint sm">1–3 things that matter</span></div>';
  if (s.focus.length === 0) {
    html += '<p class="empty">Pick the one or two things that would make today a win.</p>';
  } else {
    html += s.focus.map(i => focusRow('focus', i)).join('');
  }
  if (s.focus.length < 3) {
    html +=
      '<div class="addrow">' +
      '<input id="add-focus" placeholder="Add a focus…" onkeydown="if(event.key===\'Enter\')addFocus()" />' +
      '<button class="add" onclick="addFocus()">' + ic('plus', 18) + '</button></div>';
  }
  html += '</section>';

  html += '<section class="block"><div class="block-head"><h2 class="quiet">Bonus</h2>' +
    '<span class="faint sm">only if you have energy</span></div>';
  if (s.bonus.length === 0) {
    html += '<p class="empty sm">Nothing here — and that\'s fine.</p>';
  } else {
    html += s.bonus.map(i => bonusRow(i)).join('');
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

function focusRow(list, i) {
  return '<div class="card focusrow ' + (i.done ? 'done' : '') + '">' +
    '<button class="chk" aria-label="Complete" onclick="toggle(\'' + list + '\',\'' + i.id + '\')">' + ic('check', 15) + '</button>' +
    '<div class="grow"><div class="title">' + esc(i.title) + '</div></div>' +
    (i.done ? '' : '<button class="start" onclick="startFocus(\'' + i.id + '\')">' + ic('play', 13) + ' Start</button>') +
    '</div>';
}
function bonusRow(i) {
  return '<div class="bonusrow ' + (i.done ? 'done' : '') + '">' +
    '<button class="chk sm" aria-label="Complete" onclick="toggle(\'bonus\',\'' + i.id + '\')">' + ic('check', 13) + '</button>' +
    '<span class="grow">' + esc(i.title) + '</span>' +
    '<button class="iconbtn faint" aria-label="Remove" onclick="dropBonus(\'' + i.id + '\')">' + ic('x', 15) + '</button>' +
    '</div>';
}

function addFocus() {
  const el = document.getElementById('add-focus');
  const t = el && el.value.trim();
  if (!t) return;
  const s = Store.get();
  if (s.focus.length >= 3) {
    s.bonus.push({ id: Store.uid(), title: t, done: false });
    Store.save(); render();
    toast('That\'s a full focus list — saved to Bonus for today.');
    return;
  }
  s.focus.push({ id: Store.uid(), title: t, done: false });
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
function clearComeback() { comeback = null; render(); }

/* ---------------- capture ---------------- */
function openCapture() {
  overlay.innerHTML =
    '<div class="sheet-bg" onclick="closeCapture()"></div>' +
    '<div class="sheet"><div class="sheet-grip"></div>' +
    '<h3>Add anything</h3>' +
    '<input id="cap-input" placeholder="What\'s on your mind?" onkeydown="if(event.key===\'Enter\')capture(\'focus\')" />' +
    '<div class="row gap8 mt12">' +
    '<button class="cta grow" onclick="capture(\'focus\')">Add to focus</button>' +
    '<button class="cta ghost grow" onclick="capture(\'bonus\')">Bonus</button></div></div>';
  overlay.classList.add('show');
  setTimeout(() => { const el = document.getElementById('cap-input'); if (el) el.focus(); }, 50);
}
function closeCapture() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
function capture(target) {
  const el = document.getElementById('cap-input');
  const t = el && el.value.trim();
  if (!t) { closeCapture(); return; }
  const s = Store.get();
  if (target === 'focus' && s.focus.length < 3) {
    s.focus.push({ id: Store.uid(), title: t, done: false });
  } else {
    s.bonus.push({ id: Store.uid(), title: t, done: false });
    if (target === 'focus') toast('Focus was full — saved to Bonus.');
  }
  Store.save(); closeCapture();
  if (view !== 'today') go('today'); else render();
}

/* ---------------- focus / momentum mode ---------------- */
function startFocus(id) {
  timer.id = id;
  timer.total = 25 * 60; timer.remaining = 25 * 60; timer.running = true;
  view = 'focus'; render();
  startTick();
}
function startTick() {
  stopTick();
  timer.handle = setInterval(() => {
    if (timer.running && timer.remaining > 0) {
      timer.remaining--;
      const t = document.getElementById('timer-time');
      const r = document.getElementById('ring-prog');
      if (t) t.textContent = fmt(timer.remaining);
      if (r) r.style.strokeDashoffset = ringOffset();
      if (timer.remaining === 0) { timer.running = false; toast('Time\'s up — nice focus.'); }
    }
  }, 1000);
}
function stopTick() { if (timer.handle) { clearInterval(timer.handle); timer.handle = null; } }
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
    '<div class="focus-top muted sm">Notifications quiet · just this one thing</div>' +
    '<div class="ring-wrap"><svg viewBox="0 0 180 180" width="200" height="200">' +
    '<circle cx="90" cy="90" r="78" class="ring-bg"/>' +
    '<circle id="ring-prog" cx="90" cy="90" r="78" class="ring-fg" transform="rotate(-90 90 90)" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + ringOffset() + '"/>' +
    '<text id="timer-time" x="90" y="98" text-anchor="middle" class="ring-text">' + fmt(timer.remaining) + '</text>' +
    '</svg></div>' +
    '<div class="focus-task">' + esc(it.title) + '</div>' +
    '<div class="firststep">' + 'First tiny step: just begin. Two minutes is enough.' + '</div>' +
    '<div class="row gap8 focus-actions">' +
    '<button class="cta ghost grow" onclick="toggleFocusRun()">' + ic(timer.running ? 'pause' : 'play', 16) + ' ' + (timer.running ? 'Pause' : 'Resume') + '</button>' +
    '<button class="cta grow" onclick="finishFocus()">' + ic('check', 16) + ' Done</button></div>' +
    '</div>';
}
function toggleFocusRun() { timer.running = !timer.running; render(); }
function exitFocus() {
  const elapsed = Math.max(0, timer.total - timer.remaining);
  if (elapsed >= 20) {
    const it = Store.get().focus.find(x => x.id === timer.id);
    Store.logEvent({ t: 'focus', title: it ? it.title : '(unknown)', sec: elapsed, completed: false });
  }
  stopTick(); view = 'today'; render();
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
  Store.save(); stopTick(); view = 'today'; render();
}

/* ---------------- you ---------------- */
function renderYou() {
  const s = Store.get();
  let html = '<header class="head"><h1>You</h1></header>';

  html += '<div class="card stat"><div class="muted sm">You\'re working toward</div>' +
    '<div class="stat-big">' + esc(s.identity) + '</div></div>';

  html += '<div class="row gap8">' +
    '<div class="card stat grow"><div class="muted sm">Momentum</div><div class="stat-big teal">' + s.momentum + '<span class="sm"> ' + (s.momentum === 1 ? 'day' : 'days') + '</span></div>' +
    '<div class="faint sm">a gap never resets it</div></div></div>';

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

  html += '<section class="block"><div class="block-head"><h2 class="quiet">Your data</h2>' +
    '<span class="faint sm">yours, always</span></div>' +
    '<div class="row gap8">' +
    '<button class="cta ghost grow" onclick="exportData()">Back up</button>' +
    '<button class="cta ghost grow" onclick="importData()">Restore</button></div>' +
    '<p class="faint sm" style="margin:10px 2px 0">Saves a JSON file with everything — including the quiet history that powers future features. Stored only on this device.</p></section>';

  html += '<button class="ghost danger" onclick="confirmReset()">Reset everything</button>';
  html += '<p class="footnote">Cadence v1 · made to be kind.</p>';
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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline still fine */ });
  }
}

init();
