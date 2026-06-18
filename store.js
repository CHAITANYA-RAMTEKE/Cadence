/* Cadence — data layer. Local-first, no backend. All state in localStorage. */
const Store = (function () {
  const KEY = 'cadence.v1';

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const defaults = {
    onboarded: false,
    name: '',                       // what to call them, e.g. "Chaitanya"
    identity: 'getting better',     // their aspiration, e.g. "getting fit"
    persona: '',
    momentum: 0,                    // cumulative days shown up — only ever goes up
    lastMomentumDate: null,
    currentDate: null,              // the date today's focus/bonus belong to
    lastActiveDate: null,
    windDownTime: null,             // "HH:MM" bedtime for the opt-in day's-runway banner; null = off
    focus: [],                      // [{id,title,done}] — max 3
    bonus: [],                      // [{id,title,done}]
    parked: [],                     // [{id,title}] — never shoved at you
    onBreak: false,
    focusMins: 25,                  // last-used focus-session length (minutes) — remembered for next time
    priorities: [],                 // [{id,title,important,urgent,done}] — Eisenhower backlog
    notes: [],                      // [{id,title,body,day,updated}] — day set => daily journal note
    habits: [],                     // [{id,title,icon,cadence,log,total,created}] — Daily rhythm (forgiving; no streaks). today-done = log[todayStr]
    history: []                     // append-only event log — raw material for v2 (estimation, energy, insights)
  };

  function freshDefaults() { return JSON.parse(JSON.stringify(defaults)); }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(freshDefaults(), JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return freshDefaults();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function get() { return state; }
  function set(patch) { Object.assign(state, patch); save(); }
  function reset() { state = freshDefaults(); save(); }
  function replaceAll(obj) { state = Object.assign(freshDefaults(), obj || {}); save(); }

  /* Append-only log. Invisible to the user now; this is what v2's moats learn from. */
  function logEvent(ev) {
    if (!state.history) state.history = [];
    ev.ts = ev.ts || Date.now();
    ev.hour = new Date(ev.ts).getHours();   // time-of-day, for energy patterns
    state.history.push(ev);
    if (state.history.length > 8000) state.history = state.history.slice(-8000);
    save();
  }

  /* Move the day forward when the calendar date changes.
     The no-guilt rule: unfinished items are quietly PARKED, never piled up.
     Today always starts as a clean page. Returns info about the gap. */
  function rollDay() {
    const t = todayStr();
    if (state.currentDate === t) return { rolled: false, gap: 0, parkedCount: 0 };
    const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, t) : 0;
    if (state.currentDate) {
      const planned = state.focus.length;
      const fdone = state.focus.filter(i => i.done).length;
      logEvent({ t: 'day', date: state.currentDate, planned: planned, done: fdone, won: planned > 0 && fdone === planned, momentum: state.momentum });
    }
    const unfinished = [].concat(state.focus, state.bonus)
      .filter(i => !i.done)
      .map(i => ({ id: uid(), title: i.title }));
    state.parked = unfinished.concat(state.parked).slice(0, 60);
    state.focus = [];
    state.bonus = [];
    state.currentDate = t;
    state.lastActiveDate = t;
    save();
    return { rolled: true, gap: gap, parkedCount: unfinished.length };
  }

  /* Momentum ticks up the first time you show up each day, and never resets. */
  function touchMomentum() {
    const t = todayStr();
    if (state.lastMomentumDate !== t) {
      state.momentum += 1;
      state.lastMomentumDate = t;
      save();
    }
  }

  return { KEY, todayStr, daysBetween, uid, get, set, save, reset, replaceAll, logEvent, rollDay, touchMomentum, defaults };
})();
