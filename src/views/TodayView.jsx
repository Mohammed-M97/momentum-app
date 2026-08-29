/* ===== 8. TodayView ======================================================
   A focused "do the work" screen: the hero and today's checklist only.
   All task creation and management lives in TasksView.
   ======================================================================== */

import { EFFORT } from "../lib/config.js";
import { alive } from "../lib/entities.js";
import { todayStr } from "../lib/dates.js";
import { Bar, EmptyState } from "../components/ui.jsx";
import { IconPlus, IconCheck } from "../components/icons.jsx";

export function TodayView({ tasks, goals, categories, profile, weekMath, onToggle, goTasks }) {
  const today = todayStr();
  const list = tasks.filter((t) => alive(t) && t.date === today);
  const doneCount = list.filter((t) => t.done).length;
  const delta = weekMath.lastWeekPct === null ? null : weekMath.weekPct - weekMath.lastWeekPct;

  const greeting = (() => {
    const h = new Date().getHours();
    const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    return profile.name ? part + ", " + profile.name : part;
  })();
  const message = list.length === 0
    ? "No tasks scheduled for today. Plan one in the Tasks tab; small enough that starting feels easy."
    : doneCount === list.length
      ? "All clear. A finished day beats a perfect plan."
      : doneCount === 0
        ? "Pick the smallest item and start it. Momentum follows action."
        : "You have started. Keep the chain going.";

  return (
    <div className="view">
      <section className="hero" aria-label="Progress summary">
        <div className="hero-top">
          <div>
            <p className="eyebrow">{greeting}</p>
            <h1 className="hero-count">
              {doneCount}<span className="hero-sep">/</span>{list.length}
              <span className="hero-unit"> done today</span>
            </h1>
          </div>
          {delta !== null && (
            <div className={"delta " + (delta >= 0 ? "up" : "down")}>
              <strong>{delta >= 0 ? "+" : ""}{delta}%</strong><span>vs last week</span>
            </div>
          )}
        </div>
        <Bar pct={list.length ? (doneCount / list.length) * 100 : 0} color="var(--accent)" height={8} />
        <p className="hero-note">{message}</p>
      </section>

      <div className="rule">
        <h2>Today</h2>
        <span>tick things off here, plan in Tasks</span>
        <button className="btn sm push" onClick={goTasks}><IconPlus size={14} /> Plan tasks</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title="Nothing scheduled"
          body="Open the Tasks tab to schedule work for today."
          action={<button className="btn primary" onClick={goTasks}>Go to Tasks</button>} />
      ) : (
        <ul className="task-list">
          {list.map((t) => {
            const goal = goals.find((g) => g.id === t.goalId && alive(g));
            const cat = goal ? categories.find((c) => c.id === goal.categoryId && alive(c)) : null;
            return (
              <li key={t.id} className={"task" + (t.done ? " done" : "")}>
                <button className={"check" + (t.done ? " on" : "")} onClick={() => onToggle(t.id)}
                  aria-pressed={t.done} aria-label={(t.done ? "Mark not done: " : "Mark done: ") + t.title}>
                  {t.done && <IconCheck size={13} />}
                </button>
                <div className="task-main">
                  <span className="task-title">{t.title}</span>
                  {goal && <span className="task-goal" style={{ color: cat ? cat.color : "inherit" }}>{goal.title}</span>}
                </div>
                <span className="effort"><i className="dot" style={{ background: EFFORT[t.effort].color }} />{EFFORT[t.effort].label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
