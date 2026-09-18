/* ==========================================================================
   MOMENTUM v3 — App shell (module 14)
   Personal momentum tracker, prepared for a real backend.

   This file used to be the entire app. It has been split along the seams
   the README describes:

     lib/config.js      constants, store keys, default categories   (1)
     lib/entities.js    newEntity / touch / alive                   (2)
     lib/dates.js       date and week helpers                       (3)
     lib/storage.js     storage adapter  <-- MAIN BACKEND SEAM       (4)
     lib/seed.js        optional example data                       (5)
     lib/transfer.js    JSON export / import                       (16)
     components/icons.jsx    inline SVG icons                        (6)
     components/ui.jsx       Modal, Bar, EmptyState, Segmented, ...  (7)
     views/TodayView.jsx                                            (8)
     views/TasksView.jsx     + TaskModal                           (9)
     views/GoalsView.jsx     + GoalModal + CategoryModal          (10)
     views/WeeklyView.jsx    read-only stats, no stored data       (11)
     views/RoadmapView.jsx                                         (12)
     views/SettingsView.jsx  + Onboarding                         (13)
     App.jsx            this file: state, effects, mutations       (14)
     styles/momentum.css     CSS with theme variables              (15)

   Rule the whole app follows: views never touch storage. All state lives
   here, all persistence goes through the storage adapter. That separation
   is what makes the backend swap possible.

   Search for these markers:
     BACKEND HOOK   - the exact places where your API will plug in
     HARD CONCEPT   - explanation of a pattern that may be new to you
   ========================================================================== */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import {
  STORE_KEYS,
  DEFAULT_PROFILE,
  defaultCategories,
} from "./lib/config.js";
import { touch, nowISO, newEntity, alive } from "./lib/entities.js";
import { todayStr, longDate, weekStartOf } from "./lib/dates.js";
import { store, loadJSON, useAutoSave } from "./lib/storage.js";
import { starterData, emptyRoadmaps } from "./lib/seed.js";
import { buildExport, downloadJSON, exportFilename } from "./lib/transfer.js";
import {
  IconToday,
  IconTasks,
  IconGoals,
  IconWeekly,
  IconRoadmap,
  IconSettings,
  IconSun,
  IconMoon,
} from "./components/icons.jsx";
import { ConfirmDialog } from "./components/ui.jsx";
import { TodayView } from "./views/TodayView.jsx";
import { TasksView, TaskModal } from "./views/TasksView.jsx";
import { GoalsView, GoalModal, CategoryModal } from "./views/GoalsView.jsx";
import { WeeklyView } from "./views/WeeklyView.jsx";
import { RoadmapView } from "./views/RoadmapView.jsx";
import { SettingsView, Onboarding } from "./views/SettingsView.jsx";

import "./styles/momentum.css";

import { get, post, put, del } from "./lib/api";

/* The five "work" sections that appear in the nav bars. Settings is
   deliberately NOT here: it lives as an icon-only button in the topbar next
   to the theme toggle, so the nav stays focused on doing the work. */
const TABS = [
  { id: "today", label: "Today", Icon: IconToday },
  { id: "tasks", label: "Tasks", Icon: IconTasks },
  { id: "goals", label: "Goals", Icon: IconGoals },
  { id: "weekly", label: "Weekly", Icon: IconWeekly },
  { id: "roadmap", label: "Roadmap", Icon: IconRoadmap },
];

export default function App({ onLogout }) {
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("today");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [saveStatus, setSaveStatus] = useState({ state: "idle" });
  const [systemDark, setSystemDark] = useState(false);
  const [goalModal, setGoalModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [catModal, setCatModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleteLinked, setDeleteLinked] = useState(false);

  /* BACKEND HOOK: initial load -------------------------------------------
     Local version reads five keys from the storage adapter. API version:
     one GET /api/bootstrap (or five parallel GETs) after login, then the
     same five setState calls. Nothing below this effect changes.
     --------------------------------------------------------------------- */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true; // ← هذا الناقص
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await Promise.all([
        loadJSON(STORE_KEYS.profile, null),
        loadJSON(STORE_KEYS.categories, null),
        loadJSON(STORE_KEYS.goals, []),
        get("/tasks"),
        loadJSON(STORE_KEYS.roadmaps, []),
      ]);
      if (!mounted.current) return;
      setProfile({ ...DEFAULT_PROFILE, ...(r[0] || {}) });
      setCategories(Array.isArray(r[1]) ? r[1] : defaultCategories());
      setGoals(Array.isArray(r[2]) ? r[2] : []);
      setTasks(Array.isArray(r[3]) ? r[3] : []);
      setRoadmaps(Array.isArray(r[4]) ? r[4] : []);
      setHydrated(true); // ← الآن داخل try، بعد النجاح فقط
    } catch (err) {
      if (!mounted.current) return;
      setLoadError(
        err && err.message ? err.message : "Could not load your data",
      );
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const h = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", h);
    else if (mq.addListener) mq.addListener(h);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", h);
      else if (mq.removeListener) mq.removeListener(h);
    };
  }, []);

  /* BACKEND HOOK: persistence --------------------------------------------
     Local version: whole-collection autosave (fine for localStorage).
     API version: DELETE these five lines and instead call your API inside
     each mutation helper below (addTask -> POST /tasks, editTask -> PATCH
     /tasks/:id, softDeleteTask -> DELETE /tasks/:id which sets deletedAt
     server-side). Keep saveJSON as an offline cache write if you want
     offline support. The helpers are written one-mutation-one-function
     exactly so this swap stays mechanical.
     --------------------------------------------------------------------- */
  const report = useCallback((s) => setSaveStatus(s), []);
  useAutoSave(STORE_KEYS.profile, profile, hydrated, report);
  useAutoSave(STORE_KEYS.categories, categories, hydrated, report);
  useAutoSave(STORE_KEYS.goals, goals, hydrated, report);
  useAutoSave(STORE_KEYS.tasks, tasks, hydrated, report);
  useAutoSave(STORE_KEYS.roadmaps, roadmaps, hydrated, report);

  const theme =
    profile.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : profile.theme;

  const weekMath = useMemo(() => {
    const map = {};
    tasks.filter(alive).forEach((t) => {
      if (!t.date) return;
      const w = weekStartOf(t.date, profile.weekStart);
      if (!map[w]) map[w] = { total: 0, done: 0 };
      map[w].total += 1;
      if (t.done) map[w].done += 1;
    });
    const keys = Object.keys(map).sort();
    const current = weekStartOf(todayStr(), profile.weekStart);
    const cur = map[current] || { total: 0, done: 0 };
    const earlier = keys.filter((k) => k < current);
    const prev = earlier.length ? map[earlier[earlier.length - 1]] : null;
    const pct = (o) =>
      o && o.total ? Math.round((o.done / o.total) * 100) : 0;
    return { weekPct: pct(cur), lastWeekPct: prev ? pct(prev) : null };
  }, [tasks, profile.weekStart]);

  /* --- mutation helpers: one function per mutation = one API call each -- */

  /* BACKEND HOOK: POST /tasks */
  /* BACKEND HOOK: POST /tasks */
  const addTask = async (t) => {
    try {
      const created = await post("/tasks", {
        title: t.title,
        date: t.date ?? null,
        done: false,
        effort: t.effort ?? "low",
        goalId: t.goalId ?? null,
      });
      setTasks((p) => p.concat([created]));
    } catch (err) {
      console.error("addTask failed:", err.message);
    }
  };
  /* BACKEND HOOK: PUT /tasks/:id  { done } */
  const toggleTask = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      const updated = await put(`/tasks/${id}`, { done: !task.done });
      setTasks((p) => p.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      console.error("toggleTask failed:", err.message);
    }
  };
  /* BACKEND HOOK: PUT /tasks/:id  (full edit) */
  const saveTask = async (task) => {
    try {
      const updated = await put(`/tasks/${task.id}`, {
        title: task.title,
        date: task.date ?? null,
        done: task.done,
        effort: task.effort,
        goalId: task.goalId ?? null,
      });
      setTasks((p) => p.map((t) => (t.id === task.id ? updated : t)));
      setTaskModal(null);
    } catch (err) {
      console.error("saveTask failed:", err.message);
    }
  };
  /* BACKEND HOOK: DELETE /tasks/:id  (server sets deletedAt) */
  const softDeleteTask = async (id) => {
    try {
      await del(`/tasks/${id}`);
      setTasks((p) => p.filter((t) => t.id !== id));
    } catch (err) {
      console.error("softDeleteTask failed:", err.message);
    }
  };

  const askDeleteTask = (task) =>
    setConfirm({
      kind: "task",
      title: "Delete this task?",
      message: '"' + task.title + '" will be removed.',
      onConfirm: () => {
        softDeleteTask(task.id);
        setConfirm(null);
      },
    });

  /* BACKEND HOOK: POST /goals or PATCH /goals/:id */
  const saveGoal = (draft) => {
    if (goalModal && goalModal.goal) {
      const id = goalModal.goal.id;
      setGoals((p) => p.map((g) => (g.id === id ? touch(g, draft) : g)));
    } else {
      setGoals((p) => p.concat([newEntity(draft)]));
    }
    setGoalModal(null);
  };
  /* BACKEND HOOK: PATCH /goals/:id  { status } */
  const setStatus = (id, status) =>
    setGoals((p) => p.map((g) => (g.id === id ? touch(g, { status }) : g)));

  const askDeleteGoal = (goal) => {
    const linked = tasks.filter((t) => alive(t) && t.goalId === goal.id).length;
    setDeleteLinked(false);
    setConfirm({
      kind: "goal",
      title: "Delete this goal?",
      linked,
      message: linked
        ? '"' +
          goal.title +
          '" has ' +
          linked +
          " linked task" +
          (linked === 1 ? "" : "s") +
          ". By default those tasks stay and lose the link."
        : '"' + goal.title + '" will be removed.',
      /* BACKEND HOOK: DELETE /goals/:id (+ optional cascade or unlink of tasks) */
      onConfirm: (alsoTasks) => {
        setGoals((p) =>
          p.map((g) =>
            g.id === goal.id ? touch(g, { deletedAt: nowISO() }) : g,
          ),
        );
        setTasks((p) =>
          p.map((t) => {
            if (t.goalId !== goal.id) return t;
            return alsoTasks
              ? touch(t, { deletedAt: nowISO() })
              : touch(t, { goalId: null });
          }),
        );
        setConfirm(null);
      },
    });
  };

  /* BACKEND HOOK: DELETE /roadmaps/:id */
  const askDeleteRoadmap = (rm) =>
    setConfirm({
      kind: "roadmap",
      title: "Delete this roadmap?",
      message:
        '"' + rm.title + '" and all of its phases and steps will be removed.',
      onConfirm: () => {
        setRoadmaps((p) =>
          p.map((r) =>
            r.id === rm.id ? touch(r, { deletedAt: nowISO() }) : r,
          ),
        );
        setConfirm(null);
      },
    });

  /* Phase delete now confirms too (fixes the v2 gap). */
  const askDeletePhase = (phase, doDelete) =>
    setConfirm({
      kind: "phase",
      title: "Delete this phase?",
      message:
        '"' +
        phase.title +
        '" and its ' +
        phase.items.length +
        " step" +
        (phase.items.length === 1 ? "" : "s") +
        " will be removed.",
      onConfirm: () => {
        doDelete();
        setConfirm(null);
      },
    });

  /* --- backup ---------------------------------------------------------- */

  const exportData = () =>
    downloadJSON(
      exportFilename(),
      buildExport({ profile, categories, goals, tasks, roadmaps }),
    );

  /* SettingsView has already parsed and validated the file; all that is left
     is to confirm, because importing throws away what is here now. */
  const askImport = (incoming) => {
    const n = (count, word) => count + " " + word + (count === 1 ? "" : "s");
    setConfirm({
      kind: "import",
      title: "Replace everything with this backup?",
      confirmLabel: "Import and replace",
      message:
        "This backup holds " +
        n(incoming.goals.length, "goal") +
        ", " +
        n(incoming.tasks.length, "task") +
        " and " +
        n(incoming.roadmaps.length, "roadmap") +
        ". Everything currently in Momentum will be replaced by it.",
      onConfirm: () => {
        setProfile({
          ...DEFAULT_PROFILE,
          ...incoming.profile,
          onboarded: true,
        });
        setCategories(
          incoming.categories.length
            ? incoming.categories
            : defaultCategories(),
        );
        setGoals(incoming.goals);
        setTasks(incoming.tasks);
        setRoadmaps(
          incoming.roadmaps.length ? incoming.roadmaps : emptyRoadmaps(),
        );
        setConfirm(null);
        setTab("today");
      },
    });
  };

  const chooseStart = (mode, name) => {
    const cats = defaultCategories();
    setCategories(cats);
    if (mode === "demo") {
      const d = starterData(cats);
      setGoals(d.goals);
      setTasks(d.tasks);
      setRoadmaps(d.roadmaps);
    } else {
      setGoals([]);
      setTasks([]);
      setRoadmaps(emptyRoadmaps());
    }
    setProfile((p) => touch(p, { name, onboarded: true }));
  };

  const askReset = () =>
    setConfirm({
      kind: "reset",
      title: "Erase everything?",
      confirmLabel: "Erase everything",
      message:
        "All goals, tasks, roadmaps and categories will be deleted permanently.",
      onConfirm: () => {
        setGoals([]);
        setTasks([]);
        setRoadmaps(emptyRoadmaps());
        setCategories(defaultCategories());
        setProfile((p) => touch(p, { onboarded: true }));
        setConfirm(null);
        setTab("today");
      },
    });

  if (loadError) {
    return (
      <div className="momentum" data-theme="light">
        <div className="loading">
          <p>
            <strong>Could not load your data</strong>
          </p>
          <p className="muted">{loadError}</p>
          <p className="muted">
            Nothing has been saved over. Your data is still there.
          </p>
          <button className="btn primary" onClick={loadAll}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="momentum" data-theme="light">
        <div className="loading">
          <div className="spinner" />
          <p>Loading your data</p>
        </div>
      </div>
    );
  }
  if (!profile.onboarded) {
    return (
      <div className="momentum" data-theme={theme}>
        <Onboarding onChoose={chooseStart} />
      </div>
    );
  }

  const statusText =
    saveStatus.state === "saving"
      ? "Saving"
      : saveStatus.state === "error"
        ? "Not saved"
        : saveStatus.state === "saved"
          ? "Saved"
          : "";

  return (
    <div className="momentum" data-theme={theme}>
      <header className="topbar">
        <div className="brand-wrap">
          <div className="logo" aria-hidden="true">
            M
          </div>
          <div>
            <p className="brand">Momentum</p>
            <p className="topdate">{longDate(todayStr())}</p>
          </div>
        </div>
        <div className="topbar-right">
          {statusText && (
            <span
              className={"save-pill " + saveStatus.state}
              role="status"
              aria-live="polite"
            >
              {statusText}
            </span>
          )}
          <button
            className="icon-btn"
            aria-label={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
            onClick={() =>
              setProfile(
                touch(profile, { theme: theme === "dark" ? "light" : "dark" }),
              )
            }
          >
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>
          <button
            className={"icon-btn" + (tab === "settings" ? " on" : "")}
            onClick={() => setTab("settings")}
            aria-label="Settings"
            aria-current={tab === "settings" ? "page" : undefined}
          >
            <IconSettings size={17} />
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " on" : "")}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.Icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === "today" && (
          <TodayView
            tasks={tasks}
            goals={goals}
            categories={categories}
            profile={profile}
            weekMath={weekMath}
            onToggle={toggleTask}
            goTasks={() => setTab("tasks")}
          />
        )}
        {tab === "tasks" && (
          <TasksView
            tasks={tasks}
            goals={goals}
            categories={categories}
            onAdd={addTask}
            onToggle={toggleTask}
            onEdit={(t) => setTaskModal(t)}
            onDelete={askDeleteTask}
          />
        )}
        {tab === "goals" && (
          <GoalsView
            goals={goals}
            tasks={tasks}
            categories={categories}
            onNew={() => setGoalModal({ goal: null })}
            onEdit={(g) => setGoalModal({ goal: g })}
            onDelete={askDeleteGoal}
            onStatus={setStatus}
            onManageCats={() => setCatModal(true)}
          />
        )}
        {tab === "weekly" && (
          <WeeklyView tasks={tasks} weekStart={profile.weekStart} />
        )}
        {tab === "roadmap" && (
          <RoadmapView
            roadmaps={roadmaps}
            onChange={setRoadmaps}
            onRequestDelete={askDeleteRoadmap}
            onRequestDeletePhase={askDeletePhase}
          />
        )}
        {tab === "settings" && (
          <SettingsView
            profile={profile}
            setProfile={setProfile}
            backendLabel={store.label}
            saveStatus={saveStatus}
            onReset={askReset}
            onExport={exportData}
            onImport={askImport}
            onLogout={onLogout}
          />
        )}
      </main>

      {goalModal && (
        <GoalModal
          goal={goalModal.goal}
          categories={categories}
          onSave={saveGoal}
          onClose={() => setGoalModal(null)}
        />
      )}
      {taskModal && (
        <TaskModal
          task={taskModal}
          goals={goals}
          onSave={saveTask}
          onClose={() => setTaskModal(null)}
        />
      )}
      {catModal && (
        <CategoryModal
          categories={categories}
          onChange={setCategories}
          onClose={() => setCatModal(false)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || "Delete"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.onConfirm(deleteLinked)}
          extraActions={
            confirm.kind === "goal" && confirm.linked > 0 ? (
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={deleteLinked}
                  onChange={(e) => setDeleteLinked(e.target.checked)}
                />
                Delete the {confirm.linked} linked task
                {confirm.linked === 1 ? "" : "s"} as well
              </label>
            ) : null
          }
        />
      )}

      <nav className="bottombar" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"bottom-tab" + (tab === t.id ? " on" : "")}
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.Icon size={19} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
