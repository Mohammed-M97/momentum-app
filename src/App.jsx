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
     API WIRED      - already calling the real API (lib/api.js)
     BACKEND HOOK   - still local; where the API will plug in next
     HARD CONCEPT   - explanation of a pattern that may be new to you
   ========================================================================== */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import {
  STORE_KEYS,
  DEFAULT_PROFILE,
  defaultCategories,
} from "./lib/config.js";
import { touch, nowISO, alive } from "./lib/entities.js";
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
import { useI18n } from "./lib/i18n.js";
import { consumeLaunchIntent } from "./lib/launch.js";

/* The five "work" sections that appear in the nav bars. Settings is
   deliberately NOT here: it lives as an icon-only button in the topbar next
   to the theme toggle, so the nav stays focused on doing the work. */
const TABS = [
  { id: "today", Icon: IconToday },
  { id: "tasks", Icon: IconTasks },
  { id: "goals", Icon: IconGoals },
  { id: "weekly", Icon: IconWeekly },
  { id: "roadmap", Icon: IconRoadmap },
];

export default function App({ onLogout }) {
  const { t, lang, setLang } = useI18n();
  /* Long-press shortcuts on the installed app land here (lib/launch.js). */
  const [launch] = useState(() => consumeLaunchIntent());
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState(launch.tab || "today");
  const [focusAdd, setFocusAdd] = useState(launch.newTask);
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

  /* API WIRED + BACKEND HOOK: initial load -------------------------------
     API WIRED:    goals and tasks come from GET /goals and GET /tasks.
     BACKEND HOOK: profile, categories and roadmaps still come from the
     storage adapter. Swap each loadJSON for a GET when its endpoint exists
     (or fold everything into one GET /api/bootstrap). The five setState
     calls stay the same.
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
        get("/goals"),
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
        err && err.message ? err.message : t("load.errorTitle"),
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
     Goals and tasks no longer autosave: their mutation helpers below call
     the API directly (see API WIRED).
     Profile, categories and roadmaps still use the whole-collection
     autosave. When their endpoints exist, delete the matching useAutoSave
     line and call the API from each mutation helper instead, the same
     way tasks and goals do.
     --------------------------------------------------------------------- */
  const report = useCallback((s) => setSaveStatus(s), []);
  useAutoSave(STORE_KEYS.profile, profile, hydrated, report);
  useAutoSave(STORE_KEYS.categories, categories, hydrated, report);
  useAutoSave(STORE_KEYS.roadmaps, roadmaps, hydrated, report);

  const theme =
    profile.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : profile.theme;

  /* Paint the page behind the app and the phone status bar (installed
     app) in the active theme, not just the OS preference. */
  useEffect(() => {
    const bg = theme === "dark" ? "#14150f" : "#f1f1ec";
    document.body.style.background = bg;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }, [theme]);

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

  /* API WIRED: POST /tasks */
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
  /* API WIRED: PUT /tasks/:id  { done } */
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
  /* API WIRED: PUT /tasks/:id  (full edit) */
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
  /* API WIRED: DELETE /tasks/:id  (server sets deletedAt) */
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
      title: t("confirm.taskTitle"),
      message: t("common.removed", { title: task.title }),
      onConfirm: () => {
        softDeleteTask(task.id);
        setConfirm(null);
      },
    });

  /* API WIRED: POST /goals or PUT /goals/:id */
  const saveGoal = async (draft) => {
    const payload = {
      title: draft.title,
      why: draft.why,
      status: draft.status,
      targetDate: draft.targetDate ?? null,
      categoryId: draft.categoryId ?? null,
    };
    try {
      if (goalModal && goalModal.goal) {
        const id = goalModal.goal.id;
        const updated = await put(`/goals/${id}`, payload);
        setGoals((p) => p.map((g) => (g.id === id ? updated : g)));
      } else {
        const created = await post("/goals", payload);
        setGoals((p) => p.concat([created]));
      }
      setGoalModal(null);
    } catch (error) {
      console.error("saveGoal failed:", error.message);
    }
  };

  /* API WIRED: PUT /goals/:id  { status } */
  const setStatus = async (id, status) => {
    try {
      const updated = await put(`/goals/${id}`, { status });
      setGoals((p) => p.map((g) => (g.id === id ? updated : g)));
    } catch (error) {
      console.error("setStatus failed:", error.message);
    }
  };

  const askDeleteGoal = (goal) => {
    const linked = tasks.filter((t) => alive(t) && t.goalId === goal.id).length;
    setDeleteLinked(false);
    setConfirm({
      kind: "goal",
      title: t("confirm.goalTitle"),
      linked,
      message: linked
        ? t("confirm.goalLinked", { title: goal.title, n: linked })
        : t("common.removed", { title: goal.title }),
      /* API WIRED: DELETE /goals/:id?tasks=delete|unlink, then GET /tasks resync */
      onConfirm: async (alsoTasks) => {
        setConfirm(null);

        try {
          const mode = alsoTasks ? "delete" : "unlink";
          await del(`/goals/${goal.id}?tasks=${mode}`);
          setGoals((p) => p.filter((g) => g.id !== goal.id));
        } catch (err) {
          console.error("deleteGoal failed:", err.message);
        }

        try {
          const fresh = await get("/tasks");
          setTasks(Array.isArray(fresh) ? fresh : []);
        } catch (err) {
          console.error("task resync failed:", err.message);
        }
      },
    });
  };

  /* BACKEND HOOK: DELETE /roadmaps/:id  (not wired yet: still a local soft delete) */
  const askDeleteRoadmap = (rm) =>
    setConfirm({
      kind: "roadmap",
      title: t("confirm.roadmapTitle"),
      message: t("confirm.roadmapMsg", { title: rm.title }),
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
      title: t("confirm.phaseTitle"),
      message: t("confirm.phaseMsg", { title: phase.title, n: phase.items.length }),
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
    setConfirm({
      kind: "import",
      title: t("confirm.importTitle"),
      confirmLabel: t("confirm.importBtn"),
      message: t("confirm.importMsg", {
        g: incoming.goals.length,
        t: incoming.tasks.length,
        r: incoming.roadmaps.length,
      }),
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
      title: t("confirm.resetTitle"),
      confirmLabel: t("confirm.resetBtn"),
      message: t("confirm.resetMsg"),
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
            <strong>{t("load.errorTitle")}</strong>
          </p>
          <p className="muted">{loadError}</p>
          <p className="muted">{t("load.safe")}</p>
          <button className="btn primary" onClick={loadAll}>
            {t("load.retry")}
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
          <p>{t("load.loading")}</p>
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
      ? t("save.saving")
      : saveStatus.state === "error"
        ? t("save.error")
        : saveStatus.state === "saved"
          ? t("save.saved")
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
            aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
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
            aria-label={t("nav.settings")}
            aria-current={tab === "settings" ? "page" : undefined}
          >
            <IconSettings size={17} />
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label={t("nav.sections")}>
        {TABS.map((tb) => (
          <button
            key={tb.id}
            className={"tab" + (tab === tb.id ? " on" : "")}
            onClick={() => setTab(tb.id)}
            aria-current={tab === tb.id ? "page" : undefined}
          >
            <tb.Icon size={16} /> {t("nav." + tb.id)}
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
            onEdit={(x) => setTaskModal(x)}
            onDelete={askDeleteTask}
            autoFocusAdd={focusAdd}
            onAutoFocused={() => setFocusAdd(false)}
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
            lang={lang}
            setLang={setLang}
            backendLabel={t("storage." + store.id)}
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
          confirmLabel={confirm.confirmLabel || t("common.delete")}
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
                {t("confirm.goalAlso", { n: confirm.linked })}
              </label>
            ) : null
          }
        />
      )}

      <nav className="bottombar" aria-label={t("nav.sections")}>
        {TABS.map((tb) => (
          <button
            key={tb.id}
            className={"bottom-tab" + (tab === tb.id ? " on" : "")}
            onClick={() => setTab(tb.id)}
            aria-label={t("nav." + tb.id)}
            aria-current={tab === tb.id ? "page" : undefined}
          >
            <tb.Icon size={19} />
            <span>{t("nav." + tb.id)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
