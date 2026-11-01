/* ===== 8. TodayView ======================================================
   A focused "do the work" screen: the hero and today's checklist only.
   All task creation and management lives in TasksView.
   ======================================================================== */

import { EFFORT } from "../lib/config.js";
import { alive } from "../lib/entities.js";
import { todayStr } from "../lib/dates.js";
import { useI18n } from "../lib/i18n.js";
import { Bar, EmptyState } from "../components/ui.jsx";
import { IconPlus, IconCheck } from "../components/icons.jsx";

export function TodayView({ tasks, goals, categories, profile, weekMath, onToggle, goTasks }) {
  const { t } = useI18n();
  const today = todayStr();
  const list = tasks.filter((x) => alive(x) && x.date === today);
  const doneCount = list.filter((x) => x.done).length;
  const delta = weekMath.lastWeekPct === null ? null : weekMath.weekPct - weekMath.lastWeekPct;

  const greeting = (() => {
    const h = new Date().getHours();
    const part = t(h < 12 ? "today.morning" : h < 18 ? "today.afternoon" : "today.evening");
    return profile.name ? t("today.greetName", { part, name: profile.name }) : part;
  })();
  const message = list.length === 0
    ? t("today.msgEmpty")
    : doneCount === list.length
      ? t("today.msgAllDone")
      : doneCount === 0
        ? t("today.msgNone")
        : t("today.msgStarted");

  return (
    <div className="view">
      <section className="hero" aria-label={t("today.summary")}>
        <div className="hero-top">
          <div>
            <p className="eyebrow">{greeting}</p>
            <h1 className="hero-count">
              <bdi dir="ltr" className="num">{doneCount}<span className="hero-sep">/</span>{list.length}</bdi>
              <span className="hero-unit">{t("today.doneToday")}</span>
            </h1>
          </div>
          {delta !== null && (
            <div className={"delta " + (delta >= 0 ? "up" : "down")}>
              <strong dir="ltr">{delta >= 0 ? "+" : ""}{delta}%</strong><span>{t("today.vsLastWeek")}</span>
            </div>
          )}
        </div>
        <Bar pct={list.length ? (doneCount / list.length) * 100 : 0} color="var(--accent)" height={8} />
        <p className="hero-note">{message}</p>
      </section>

      <div className="rule">
        <h2>{t("nav.today")}</h2>
        <span>{t("today.hint")}</span>
        <button className="btn sm push" onClick={goTasks}><IconPlus size={14} /> {t("today.plan")}</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={t("today.emptyTitle")}
          body={t("today.emptyBody")}
          action={<button className="btn primary" onClick={goTasks}>{t("today.goTasks")}</button>} />
      ) : (
        <ul className="task-list">
          {list.map((x) => {
            const goal = goals.find((g) => g.id === x.goalId && alive(g));
            const cat = goal ? categories.find((c) => c.id === goal.categoryId && alive(c)) : null;
            return (
              <li key={x.id} className={"task" + (x.done ? " done" : "")}>
                <button className={"check" + (x.done ? " on" : "")} onClick={() => onToggle(x.id)}
                  aria-pressed={x.done} aria-label={t(x.done ? "common.markNotDone" : "common.markDone") + x.title}>
                  {x.done && <IconCheck size={13} />}
                </button>
                <div className="task-main">
                  <span className="task-title">{x.title}</span>
                  {goal && <span className="task-goal" style={{ color: cat ? cat.color : "inherit" }}>{goal.title}</span>}
                </div>
                <span className="effort"><i className="dot" style={{ background: EFFORT[x.effort].color }} />{t("effort." + x.effort)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
