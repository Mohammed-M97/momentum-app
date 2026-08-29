# Momentum

A small, offline-first personal planner — tasks, goals, weekly stats and a
roadmap board — built with **React + Vite**. No backend required: everything
is stored in the browser and can be exported to a JSON file.

This repo is also a **learning project**. Alongside the app there are five
long-form HTML documents that explain how it works and lay out, step by step,
how to grow it into a real client/server application.

---

## Run it

```bash
npm install        # first time only
npm run dev        # http://localhost:5173 (opens automatically)
```

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Optional — copy `.env.example` to `.env` if you want to point the (in-progress)
API client at a server:

```
VITE_API_URL=http://localhost:3000
```

---

## What the app does

| Screen | What it holds |
|---|---|
| **Today** | The day's tasks, grouped by effort, with a greeting that uses your name. |
| **Tasks** | The full task list — create, edit, reschedule, soft-delete, link to a goal. |
| **Goals** | Goals with a target date, a status (active / paused / done) and a progress bar **computed from linked tasks**. Categories are editable user data. |
| **Weekly** | Read-only aggregation over tasks for the current week. Stores nothing of its own. |
| **Roadmap** | Phase/milestone board for longer-horizon planning. |
| **Settings** | Gear icon in the topbar (not a nav tab): profile name, theme, week start day, JSON backup/restore, active storage backend, erase everything. |

Data is saved automatically — a **Saved** pill appears in the top-right when a
write succeeds, and an error message appears there if one fails.

---

## Project layout

One idea per file. The numbers are the module numbering used throughout the
code comments.

```
src/
├─ main.jsx                 React entry point (mounts <App/>)
├─ App.jsx             (14) the shell: all state, effects, mutations, routing
│
├─ lib/                     pure logic — no JSX, no styling
│  ├─ config.js       (1)   constants, store keys, default categories
│  ├─ entities.js     (2)   newEntity / touch / alive  (the entity envelope)
│  ├─ dates.js        (3)   date + week math helpers
│  ├─ storage.js      (4)   storage adapter  ← MAIN BACKEND SEAM
│  ├─ seed.js         (5)   optional example data
│  ├─ transfer.js    (16)   JSON export / import (backup)
│  ├─ api.js                HTTP client — WORK IN PROGRESS, not wired up yet
│  └─ auth.js               token save/read/clear in localStorage
│
├─ components/              reusable presentation pieces
│  ├─ icons.jsx       (6)   every inline SVG icon
│  └─ ui.jsx          (7)   Modal, ConfirmDialog, Bar, EmptyState,
│                           Segmented, Field, CatChip
│
├─ views/                   one file per screen (tab)
│  ├─ TodayView.jsx   (8)
│  ├─ TasksView.jsx   (9)   + TaskModal
│  ├─ GoalsView.jsx  (10)   + GoalCard + GoalModal + CategoryModal + goalProgress
│  ├─ WeeklyView.jsx (11)   read-only stats
│  ├─ RoadmapView.jsx(12)
│  └─ SettingsView.jsx(13)  profile, theme, week start, backup, erase
│                           + Onboarding
│
└─ styles/
   └─ momentum.css   (15)   all of the app's CSS
```

**The one rule that keeps this organized:** views never touch storage. Every
view receives its data and its callbacks as props. All state lives in
`App.jsx`; all persistence goes through `lib/storage.js`. That single
separation is what lets a real backend drop in later without rewriting any
screen.

---

## The ideas the code is built on

| Concept | File | In one line |
|---|---|---|
| Entity envelope | `lib/entities.js` | Every record has an id + `createdAt` / `updatedAt` / `deletedAt`. |
| Soft delete | `lib/entities.js` | Delete = set `deletedAt`; `alive()` filters. Nothing is ever removed. |
| Storage adapter | `lib/storage.js` | One interface, interchangeable backends chosen by feature detection. |
| Debounced autosave | `lib/storage.js` | Wait 350 ms of silence before writing, so typing is not one save per keystroke. |
| Derived state | `views/GoalsView.jsx` | Goal progress is *computed* from tasks, never stored. |
| Metrics are queries | `views/WeeklyView.jsx` | The Weekly tab is an aggregation over tasks — it owns zero collections. |

### The five schema decisions

1. **Timestamps on every entity** — `createdAt` / `updatedAt` / `deletedAt`.
2. **Categories are user data** — an editable list, not a hardcoded enum.
3. **Goals have a real `targetDate`** — the UI derives "6w left" from it.
4. **Goal progress is derived** — a COUNT over linked tasks, never a column.
5. **Soft delete everywhere** — `deletedAt` + `alive()`.

---

## Storage

`lib/storage.js` picks one of three local backends at startup by feature
detection, and exposes the same `get(key)` / `set(key, value)` interface for
each:

| Backend | When it is used | Label shown in Settings |
|---|---|---|
| `claude` | `window.storage` exists | Saved to your Claude account |
| `local` | `localStorage` is writable | Saved in this browser |
| `memory` | neither works | Storage unavailable here, data lasts this session only |

Adding a fourth HTTP backend here is the intended path to a real server — with
one caveat spelled out in the file: do not implement `set()` as "upload the
whole array". Replace the five `useAutoSave` calls in `App.jsx` with per-record
API calls instead, and keep the local backend as an offline cache.

### Backup (export / import)

Export writes one file, `momentum-backup-YYYY-MM-DD.json`, wrapped in a
versioned envelope:

```json
{
  "app": "momentum",
  "version": 3,
  "exportedAt": "2026-07-25T09:31:00.000Z",
  "data": { "profile": {}, "categories": [], "goals": [], "tasks": [], "roadmaps": [] }
}
```

`momentum-backup-sample.json` in the repo root is a real example file.

Import never trusts the file. `parseImport()` in `lib/transfer.js` rejects
non-JSON, files from other apps and damaged collections, each with a message
safe to show on screen. Only after it parses cleanly does `App.jsx` ask you to
confirm — importing **replaces** everything currently in the app.

Keep the `version` field: it is how a future you reads an old file. The whole
envelope is also the easiest thing for a first real API to accept, so a local
user can move their data into a new account in one request.

Responsibility split follows the app's one rule: `SettingsView` only *parses*
the picked file and hands the result up; `App.jsx` decides whether to apply it.
The view still never touches storage.

---

## Backend hooks

Every mutation is one small named function. **One function = one endpoint.**
That is deliberate — the backend swap is meant to be mechanical. Search the
project for `BACKEND HOOK` to jump between these.

| What | File | Notes |
|---|---|---|
| Storage adapter | `lib/storage.js` | The main seam. Add a 4th HTTP backend here. |
| Initial load | `App.jsx` (load effect) | Becomes `GET /api/bootstrap` after login. |
| Persistence (autosave) | `App.jsx` (the `useAutoSave` calls) | Replace with per-record API calls. |
| `POST /tasks` | `App.jsx` → `addTask` | |
| `PATCH /tasks/:id { done }` | `App.jsx` → `toggleTask` | |
| `PATCH /tasks/:id` (full edit) | `App.jsx` → `saveTask` | |
| `DELETE /tasks/:id` | `App.jsx` → `softDeleteTask` | Server sets `deletedAt`. |
| `POST` / `PATCH /goals/:id` | `App.jsx` → `saveGoal` | |
| `PATCH /goals/:id { status }` | `App.jsx` → `setStatus` | |
| `DELETE /goals/:id` | `App.jsx` → `askDeleteGoal` | Optional task cascade/unlink. |
| `DELETE /roadmaps/:id` | `App.jsx` → `askDeleteRoadmap` | |
| Migration path | `lib/transfer.js` | `POST /api/import` can accept the export envelope as-is. |

### Current state of the API work

`src/lib/auth.js` is done: it stores, reads and clears a bearer token under
`momentum_token` in `localStorage`.

`src/lib/api.js` is a **work in progress**. It has the shape of the client —
a `request()` helper that attaches `Authorization: Bearer <token>`, sets
`Content-Type` only when there is a body, serialises object bodies, turns a
failed `fetch` into a `status: 0` error, and clears the token on `401` — plus
`get` / `post` / `put` / `del` wrappers. It is not imported anywhere in the app
yet, and its error-handling block is not reached in the current draft.

---

## The written documentation

Five standalone HTML pages, readable by opening them straight in a browser.
They were written to explain this codebase to someone learning, in order:

| File | What it covers |
|---|---|
| `how-it-works.html` | **How Momentum works, explained from zero** — props and callbacks, the story of one click, who lives in which folder, the five ideas the code is built on, and where your data actually is. |
| `lib-explained.html` | **Inside `lib/`** — how the logic files depend on each other, the entity envelope, soft delete, how the storage adapter picks a backend, and the five data shapes in one place. |
| `trace-map.html` | **Signal Trace** — five lanes, and every trace runs through the same five: add a task, edit a task, delete a task, first page load, plus the whole wiring diagram. |
| `backend-roadmap.html` | **Local app to your own server, in nine steps** — the stack to pick, fixing the data-loss bug, a backend skeleton, schema and data migration, reads, writes one mutation at a time, login, deploying all three pieces, making two devices agree, and making it feel like a phone app. |
| `api-roadmap.html` | **The Momentum API: what to build, in order** — what a backend actually is, the folder layout, the five models, every endpoint and who calls it, the password concretely, four traps that each cost an evening, and the build order. |

---

## Notable changes along the way

- **Split from one file into modules.** The app began as a single
  `Momentum.jsx`; it is now the module layout above, one idea per file.
- **Removed the "Weekly review" section** from the Weekly tab (three textareas
  and a week picker). The Weekly tab is now purely read-only stats, and all of
  its plumbing went with it: the `notes` state, the `setNote` mutation, its
  autosave and the `momentum_notes` store key. Anything typed there is still
  sitting in `localStorage` under `momentum_notes`, so this is reversible.
- **Fixed a stray vertical scrollbar** in the tab bar. `.tabs` uses
  `overflow-x: auto` for narrow screens, and per CSS spec that promotes the
  other axis from `visible` to `auto` — so the tabs' `margin-bottom: -1px` was
  enough to make Chrome draw a vertical scrollbar. Fixed with an explicit
  `overflow-y: hidden` (see the comment in `styles/momentum.css`).
- **Moved Settings out of the nav bars** into an icon-only gear button in the
  topbar beside the theme toggle. `TABS` in `App.jsx` now holds only the five
  work sections, so both the desktop tab strip and the mobile bottom bar
  dropped to five items.
- **Added: edit your name** (Settings → Profile). `profile.name` used to be
  captured once during onboarding and was then unchangeable.
- **Added: week start day** (Settings → Week). `profile.weekStart` is a JS day
  number (0 = Sunday … 6 = Saturday) and every week calculation already read
  it — it was just hardcoded with no UI. Changing it regroups history instantly
  and alters no data, because the Weekly chart is computed from tasks on every
  render. That is "metrics are queries" paying off in practice.
- **Added: JSON export / import** (Settings → Backup) in `lib/transfer.js`.
- **Made `loadJSON` surface corruption** instead of silently falling back: a bad
  JSON payload now throws `Saved data for "<key>" is corrupted` rather than
  quietly returning the default (the previous version is kept commented out in
  `lib/storage.js` for comparison).
- **Started the API layer** — `lib/auth.js` and `lib/api.js`, described above.

---

## Testing

There is no test runner wired into this project yet. `parseImport()` in
`lib/transfer.js` was covered during development by a throwaway Node script
(17 assertions: lossless round-trip, rejection of non-JSON / foreign / damaged
files, tolerance of absent collections). If you add a runner — Vitest is the
natural fit for Vite — `parseImport` is the obvious first thing to cover.
