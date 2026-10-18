# Momentum

A small personal planner — tasks, goals, weekly stats and a roadmap board —
built with **React + Vite**. The app is partway through moving from
browser-only storage to its own server:

- **Goals and tasks** live on the server and go through the HTTP API.
- **Profile, categories and roadmaps** are still saved in the browser.
- **Everything** can be exported to a JSON file.

The app opens behind a **sign-in screen**, and loads goals and tasks from the
API as soon as you are in. See [Signing in](#signing-in): **you need a backend
running to use it.** The backend is not part of this repo; the endpoints it
must serve are listed under [Backend hooks](#backend-hooks).

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

Every API request goes to `VITE_API_URL`. **It is required:** `lib/api.js`
throws `VITE_API_URL is not set` at startup if it is missing, rather than
silently falling back to a guessed address.

- `.env.development` is committed and sets it to `http://localhost:3000`, so
  `npm run dev` works out of the box.
- For a production build, or to point at another server, copy `.env.example`
  to `.env` (ignored by git) and set your own URL.

```
VITE_API_URL=http://localhost:3000
```

### Demo mode

Open the app with `?demo` in the URL (for example
`http://localhost:5173/?demo`) to try it without an account:

1. `main.jsx` calls `startDemoIfRequested()` from `lib/demo.js` **before**
   rendering anything.
2. It removes `?demo` from the address bar, so a refresh does not start a
   second demo.
3. If a demo session is still valid (`hasActiveDemo()`), it stops there and
   reuses it.
4. Otherwise it calls `POST /auth/demo` with your time zone, and saves the
   returned `token` and `expiresAt`.
5. It marks the profile as onboarded (name `Guest` if none is set), so you
   land straight on Today instead of the onboarding screen.

If the demo request fails, the error is logged to the console and the app
renders normally — you just see the login screen. Signing out clears both the
token and the demo expiry.

### Signing in

`AuthGate` is now the root component, so the first thing the app renders is
`LoginView`, not `Today`. The gate's only question is whether a token exists in
`localStorage` — it does not validate it.

Past the gate, `App` immediately calls `GET /goals` and `GET /tasks`, so
**the app needs a running backend** that serves `POST /auth/login` plus the
task and goal endpoints in [Backend hooks](#backend-hooks). There is no
offline way in any more:

- With no server, the load fails and the app shows the error with a retry
  button.
- A fake token set by hand in `localStorage` is rejected by a real server with
  `401`. `api.js` then clears the token, and `AuthGate` sends you back to the
  login screen.

That `401` path works anywhere: if the token expires mid-session, the next
request signs you out automatically. `AuthGate` registers the handler through
`setUnauthorizedHandler()` in `lib/auth.js`, and `api.js` calls
`notifyUnauthorized()`.

Signing out lives in Settings → Sign out. It clears the token and drops you
back to the login screen; **it does not erase your data** — that is the
separate button above it.

---

## What the app does

| Screen | What it holds |
|---|---|
| **Today** | The day's tasks, grouped by effort, with a greeting that uses your name. |
| **Tasks** | The full task list — create, edit, reschedule, soft-delete, link to a goal. |
| **Goals** | Goals with a target date, a status (active / paused / done) and a progress bar **computed from linked tasks**. Categories are editable user data. |
| **Weekly** | Read-only aggregation over tasks for the current week. Stores nothing of its own. |
| **Roadmap** | Phase/milestone board for longer-horizon planning. |
| **Settings** | Gear icon in the topbar (not a nav tab): profile name, theme, week start day, JSON backup/restore, active storage backend, sign out, erase everything. |
| **Sign in** | Shown by `AuthGate` whenever there is no token. Email + password → `POST /auth/login`. |

Profile, categories and roadmaps are saved automatically. A **Saved** pill
appears in the top-right when one of those writes succeeds, and an error
message appears there if it fails. Task and goal changes go straight to the
API instead, and do not drive the pill. See [Known gaps](#known-gaps).

---

## Project layout

One idea per file. The numbers are the module numbering used throughout the
code comments.

```
src/
├─ main.jsx                 React entry point: starts a demo if ?demo,
│                           then mounts <AuthGate/>
├─ AuthGate.jsx             token present?  ->  <App/>  :  <LoginView/>
├─ App.jsx             (14) the shell: all state, effects, mutations, routing
│
├─ lib/                     pure logic — no JSX, no styling
│  ├─ config.js       (1)   constants, store keys, default categories
│  ├─ entities.js     (2)   newEntity / touch / alive  (the entity envelope)
│  ├─ dates.js        (3)   date + week math helpers
│  ├─ storage.js      (4)   storage adapter  ← MAIN BACKEND SEAM
│  ├─ seed.js         (5)   optional example data
│  ├─ transfer.js    (16)   JSON export / import (backup)
│  ├─ api.js                HTTP client: get / post / put / del
│  ├─ auth.js               token + demo expiry in localStorage, 401 handler
│  └─ demo.js               ?demo in the URL -> POST /auth/demo -> signed in
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
│  ├─ SettingsView.jsx(13)  profile, theme, week start, backup, sign out,
│  │                        erase + Onboarding
│  └─ LoginView.jsx         email + password -> POST /auth/login
│
└─ styles/
   └─ momentum.css   (15)   all of the app's CSS
```

**The one rule that keeps this organized:** views never touch storage or the
API. Every view receives its data and its callbacks as props. All state lives
in `App.jsx`, and all persistence starts there too: `lib/api.js` for goals and
tasks, `lib/storage.js` for everything else. That separation is why moving
tasks and goals onto the server did not touch a single screen.

`LoginView` is the one deliberate exception, and only because it runs *before*
`App` exists: it calls `post()` and `saveToken()` itself, then tells `AuthGate`
it is done with a bare `onSuccess()`. The gate never sees the token —
`lib/auth.js` owns `localStorage`, the gate owns a boolean.

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

Goals and tasks now live on the server; this section covers the data that is
still local: **profile, categories and roadmaps**.

`lib/storage.js` picks one of three local backends at startup by feature
detection, and exposes the same `get(key)` / `set(key, value)` interface for
each:

| Backend | When it is used | Label shown in Settings |
|---|---|---|
| `claude` | `window.storage` exists | Saved to your Claude account |
| `local` | `localStorage` is writable | Saved in this browser |
| `memory` | neither works | Storage unavailable here, data lasts this session only |

Tasks and goals already show the intended way off this adapter. Their
`useAutoSave` calls were deleted, and each mutation helper calls the API
directly. Do **not** implement `set()` as "upload the whole array". The three
remaining `useAutoSave` calls in `App.jsx` (profile, categories, roadmaps)
should go the same way as their endpoints appear, with the local backend kept
as an offline cache.

Since `loadJSON` stopped swallowing errors, a corrupted local value fails the
whole initial load: the app shows the error and a **Try again** button rather
than starting from defaults and saving over what was there.

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

Import never trusts the file. `parseImport()` in `lib/transfer.js` rejects
non-JSON, files from other apps and damaged collections, each with a message
safe to show on screen. Only after it parses cleanly does `App.jsx` ask you to
confirm — importing **replaces** everything currently on screen. Export includes
the goals and tasks loaded from the server. Import, however, does not send
goals and tasks back to the server yet, so imported goals and tasks are lost
on reload. See [Known gaps](#known-gaps).

Keep the `version` field: it is how a future you reads an old file. The whole
envelope is also the easiest thing for a first real API to accept, so a local
user can move their data into a new account in one request.

Responsibility split follows the app's one rule: `SettingsView` only *parses*
the picked file and hands the result up; `App.jsx` decides whether to apply it.
The view still never touches storage.

---

## Backend hooks

Every mutation is one small named function. **One function = one endpoint.**
That is deliberate — the backend swap is meant to be mechanical. The code
marks each one with one of two comments:

- `API WIRED` — already calling the real API through `lib/api.js`.
- `BACKEND HOOK` — still local; where the API plugs in next.

**Wired** — the backend must serve these:

| Endpoint | File | Notes |
|---|---|---|
| `POST /auth/login` | `views/LoginView.jsx` → `submit` | `{ email, password }` in, `{ token }` back. |
| `POST /auth/demo` | `lib/demo.js` → `startDemoIfRequested` | `{ tz }` in, `{ token, expiresAt }` back. Only called when the URL has `?demo`. |
| `GET /goals`, `GET /tasks` | `App.jsx` → `loadAll` | Initial load, after login. |
| `POST /tasks` | `App.jsx` → `addTask` | Server returns the created task (with its id). |
| `PUT /tasks/:id { done }` | `App.jsx` → `toggleTask` | |
| `PUT /tasks/:id` (full edit) | `App.jsx` → `saveTask` | `title`, `date`, `done`, `effort`, `goalId`. |
| `DELETE /tasks/:id` | `App.jsx` → `softDeleteTask` | Server sets `deletedAt`. |
| `POST /goals` / `PUT /goals/:id` | `App.jsx` → `saveGoal` | `title`, `why`, `status`, `targetDate`, `categoryId`. |
| `PUT /goals/:id { status }` | `App.jsx` → `setStatus` | |
| `DELETE /goals/:id?tasks=delete\|unlink` | `App.jsx` → `askDeleteGoal` | Server deletes or unlinks the goal's tasks; the app then re-fetches `GET /tasks`. |

Every response is expected in the envelope `api.js` unwraps:
`{ success, data, message }`.

**Still local** — the next hooks to convert:

| What | File | Notes |
|---|---|---|
| Profile, categories, roadmaps load | `App.jsx` → `loadAll` (`loadJSON` calls) | Swap each for a `GET`, or fold all into one `GET /api/bootstrap`. |
| Profile, categories, roadmaps save | `App.jsx` (the three `useAutoSave` calls) | Replace with per-record calls, as tasks and goals did. |
| `DELETE /roadmaps/:id` | `App.jsx` → `askDeleteRoadmap` | Still a local soft delete. |
| Storage adapter | `lib/storage.js` | Remains as the local backend / future offline cache. |
| Migration path | `lib/transfer.js` | `POST /api/import` can accept the export envelope as-is. |

### Current state of the API work

`src/lib/auth.js` stores, reads and clears a bearer token under
`momentum_token` in `localStorage`. For demo sessions it also keeps the expiry
under `momentum_demo_expires`: `saveDemo()` writes it, `hasActiveDemo()`
checks there is a token and the expiry is still in the future, and
`clearToken()` removes both keys. It also holds a single "unauthorized"
callback: `AuthGate` registers it with `setUnauthorizedHandler()`, and
`api.js` fires it with `notifyUnauthorized()`.

`src/lib/api.js` is used by `LoginView` and by every task and goal mutation in
`App.jsx`. `request()` attaches `Authorization: Bearer <token>`, sets
`Content-Type` only when there is a body, serialises object bodies, and turns
a failed `fetch` into a `status: 0` error. On a `401` it clears the token
and notifies the gate, which drops you back to the login screen. `get` /
`post` / `put` / `del` wrap it.

Its response handling is finished, and it is worth reading in order, because
the ordering is the whole trick:

1. Read the body as text once, then try to parse it.
2. If the parse fails **and the status was fine**, that is a broken response —
   an HTML error page from a proxy, a truncated download — and the only thing
   worth reporting. If the parse fails and the status was *not* fine, fall
   through, so step 3 reports the real HTTP problem instead of the unreadable
   body, which is only a symptom of it.
3. `!response.ok` throws with `payload.message` first, then `statusText`. That
   is why `LoginView` shows `err.message` raw: a wrong password surfaces the
   server's own "Invalid credentials" and a stopped backend surfaces the
   network message, so there is nothing for the view to map.
4. A `200` carrying `{ success: false }` still throws.
5. Otherwise it returns `payload.data`, not the envelope — callers get the
   record, and the client owns the unwrapping.

Goals and tasks are fully on the API: loaded with `GET`, changed one record
at a time, and no longer autosaved locally. Profile, categories and roadmaps
are the remaining local collections.

### Known gaps

Goals and tasks moved to the server first; these features still treat them
as purely local state:

- **Errors from task / goal calls are silent.** Each helper catches the error
  and only logs it to the console. The screen does not change and the
  **Saved** pill is not involved, so a failed add or edit looks like nothing
  happened.
- **Import** replaces goals and tasks in memory without sending them to the
  server. They vanish on reload.
- **Example data** (onboarding's "start with examples") has the same problem
  for its sample goals and tasks.
- **Erase everything** clears goals and tasks on screen only. The server still
  has them, and they come back on the next load.

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

These pages were written before the API work began, so their route names are
a plan rather than a spec: they use `/api/login` and `/api/...`, while the app
calls `/auth/login`, `/goals` and `/tasks`. Where they disagree, the
[Backend hooks](#backend-hooks) tables above match the code.

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
- **Added a login gate.** `AuthGate.jsx` is now the root component and
  `main.jsx` renders it instead of `<App/>`. It holds one boolean, seeded from
  `isLoggedIn()`, and swaps between `LoginView` and `App`. This is the change
  that stops the app being runnable on its own — see
  [Signing in](#signing-in).
- **Added `views/LoginView.jsx`** — the first screen that calls the API for
  real. Two details worth keeping: there is no `<form>` element on purpose (a
  bare submit reloads the page), so the button's `onClick` is the submit path
  and Enter on either input is wired to the same handler; and it renders its
  own `.momentum` wrapper using the OS colour preference, because every theme
  variable is defined on `.momentum[data-theme]` and `profile.theme` has not
  been loaded yet at that point.
- **Added: sign out** (Settings → Sign out). `App` takes an `onLogout` prop and
  passes it down to `SettingsView`; the gate clears the token and flips its
  boolean. Data is left untouched — erasing is still the separate button.
- **Finished `api.js`'s error handling** — the unparseable-body branch above.
  The draft returned `JSON.parse(text).data` before ever reaching the
  `!response.ok` check, so a failed request either returned `undefined` (JSON
  error body) or threw a raw `SyntaxError` (HTML error page) instead of an
  error anyone could act on.
- **Moved tasks onto the API**, starting with `addTask` → `POST /tasks`, then
  toggle, edit and delete. The server now assigns ids and timestamps; the app
  replaces its copy with whatever the server returns.
- **Moved goals onto the API** — create, edit, status change and delete. Goal
  delete passes `?tasks=delete|unlink` and re-fetches the task list afterwards,
  because the server may have changed linked tasks.
- **Initial load now reads goals and tasks from the server** (`GET /goals`,
  `GET /tasks`) alongside the three local collections. Their `useAutoSave`
  calls were removed.
- **Load failures are shown, not hidden.** A failed load (server down, or
  corrupted local data) shows the error and a **Try again** button.
  `hydrated` is only set after a successful load, so autosave can never
  overwrite good data with defaults.
- **Automatic sign-out on `401`.** `lib/auth.js` gained
  `setUnauthorizedHandler` / `notifyUnauthorized`; an expired or rejected
  token now returns you to the login screen from anywhere in the app.
- **Removed `momentum-backup-sample.json`** from the repo.
- **`VITE_API_URL` is now required.** `lib/api.js` no longer falls back to
  `http://localhost:3000`; it throws at startup if the variable is missing.
  `.env.development` was added so local development still works with no
  setup. See [Run it](#run-it).
- **`.claude/` is ignored by git** — local editor/assistant settings stay out
  of the repo.
- **Added demo mode** (`lib/demo.js`). Visiting the app with `?demo` gets a
  temporary account from `POST /auth/demo`, skips onboarding and signs you in.
  `lib/auth.js` gained `saveDemo` / `hasActiveDemo` and the
  `momentum_demo_expires` key, and `main.jsx` now waits for the demo check
  before rendering. See [Demo mode](#demo-mode).

---

## Testing

There is no test runner wired into this project yet. `parseImport()` in
`lib/transfer.js` was covered during development by a throwaway Node script
(17 assertions: lossless round-trip, rejection of non-JSON / foreign / damaged
files, tolerance of absent collections). If you add a runner — Vitest is the
natural fit for Vite — `parseImport` is the obvious first thing to cover.

---

## License

[MIT](LICENSE)
