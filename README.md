# Cadence — v1 (web app / PWA)

A daily planner you **can't fall behind in**. Built for students & self-improvement.
No build step, no dependencies — plain HTML/CSS/JS + a service worker.

## What works in this build
- **Onboarding** (≤90s): promise → persona → aspiration → the 1–3 rule → first focus.
- **Winnable day**: pick **1–3 "Today's Focus"** (a 4th is gently sent to Bonus), check them off,
  and get the **"You won today"** celebration when they're all done.
- **Momentum**: a cumulative "Day N" counter that **only goes up** — a gap never resets it.
- **Capture** (the `+` button): add anything to focus or bonus.
- **Focus mode**: tap **Start** on a focus item for a calm timer + "first tiny step".
- **Gentle rollover / comeback**: a new day starts as a clean page; yesterday's unfinished items
  are quietly **parked** (never piled up). Return after a gap → a warm welcome, no shame.
- **You** tab: your aspiration, momentum, parked items (bring back or let go), **Take a break**, reset.
- **Offline + installable** (PWA).

## Run it on your computer
You have Python and Node — either works. A local server is required (service workers don't run from `file://`).

```powershell
cd "E:\Daily planer\app"
python -m http.server 8000
```
Then open <http://localhost:8000>.

Or with Node:
```powershell
cd "E:\Daily planer\app"
npx serve -l 8000
```

## Use it on your phone (same Wi-Fi)
1. Find your PC's IP: run `ipconfig` and look for the IPv4 address (e.g. `192.168.1.42`).
2. With the server running, open `http://192.168.1.42:8000` on your phone's browser.
3. *Note:* full PWA install (home-screen + offline) needs **HTTPS**. Over plain Wi-Fi you can still
   use it in the browser. For the real installable experience, deploy to a free HTTPS host —
   **GitHub Pages** or **Netlify** (ask Claude to set this up; it takes a few minutes).

## Add to home screen
Once served over HTTPS (or on localhost): browser menu → **Install app** / **Add to Home Screen**.
It then opens full-screen like a native app and works offline.

## Your data
Everything is stored locally on the device (localStorage) — nothing leaves your phone.
Clearing the browser's site data, or **Reset everything** in the You tab, wipes it.

## Roadmap (next builds)
- Evening reflect ritual · habits-lite (recurring) · kind local reminders · light scheduling/timeline.
- Later (v2): the AI/data moats — energy-aware scheduling, the estimation engine, AI planning.
