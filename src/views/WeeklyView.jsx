/* ===== 11. WeeklyView ====================================================
   Pure read-only stats. Everything on this screen is computed from tasks;
   there is nothing to fill in and nothing of its own to store.
   ======================================================================== */

import { useMemo } from "react";
import { alive } from "../lib/entities.js";
import { weekStartOf, todayStr, shortDate } from "../lib/dates.js";
import { EmptyState } from "../components/ui.jsx";
import { useI18n } from "../lib/i18n.js";

export function WeeklyView({ tasks, weekStart }) {
  const { t } = useI18n();
  /* HARD CONCEPT: metrics are queries, not tables -------------------------
     Everything on this screen is computed from the tasks array on every
     render (cached by useMemo). Nothing here is stored, so this whole
     section needs ZERO collections of its own on the backend. The chart is
     an aggregation over tasks; in MongoDB that is a $group pipeline, in SQL
     a GROUP BY week. If you ever change the metric, you change this
     function, not your database.
     --------------------------------------------------------------------- */
  const weeks = useMemo(() => {
    const map = {};
    tasks.filter(alive).forEach((t) => {
      if (!t.date) return;
      const w = weekStartOf(t.date, weekStart);
      if (!map[w]) map[w] = { total: 0, done: 0 };
      map[w].total += 1;
      if (t.done) map[w].done += 1;
    });
    const current = weekStartOf(todayStr(), weekStart);
    if (!map[current]) map[current] = { total: 0, done: 0 };
    return Object.keys(map).map((week) => {
      const v = map[week];
      return { week, total: v.total, done: v.done, pct: v.total ? Math.round((v.done / v.total) * 100) : 0 };
    }).sort((a, b) => a.week.localeCompare(b.week));
  }, [tasks, weekStart]);

  const currentKey = weekStartOf(todayStr(), weekStart);
  const idx = weeks.findIndex((w) => w.week === currentKey);
  const thisWeek = weeks[idx] || { pct: 0, done: 0, total: 0 };
  const lastWeek = idx > 0 ? weeks[idx - 1] : null;
  const delta = lastWeek ? thisWeek.pct - lastWeek.pct : null;
  const recent = weeks.slice(-6);
  const hasHistory = weeks.some((w) => w.total > 0);

  return (
    <div className="view">
      <div className="rule">
        <h2>{t("weekly.title")}</h2>
        <span>{t("weekly.hint")}</span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <p className="stat-label">{t("weekly.thisWeek")}</p>
          <p className="stat-value">{thisWeek.pct}%</p>
          {delta !== null
            ? <p className={"stat-sub " + (delta >= 0 ? "up" : "down")}><bdi dir="ltr">{delta >= 0 ? "+" : ""}{delta}%</bdi> {t("today.vsLastWeek")}</p>
            : <p className="stat-sub muted">{t("weekly.ofDone", thisWeek)}</p>}
        </div>
        <div className="stat">
          <p className="stat-label">{t("weekly.finished")}</p>
          <p className="stat-value">{thisWeek.done}</p>
          <p className="stat-sub muted">{lastWeek ? t("weekly.lastWeekN", { n: lastWeek.done }) : t("goals.thisWeek")}</p>
        </div>
        <div className="stat">
          <p className="stat-label">{t("weekly.lastWeek")}</p>
          <p className="stat-value">{lastWeek ? lastWeek.pct + "%" : "--"}</p>
          <p className="stat-sub muted">{lastWeek ? t("weekly.baseline") : t("weekly.noData")}</p>
        </div>
      </div>

      <section className="chart-card" aria-label={t("weekly.chart")}>
        <p className="chart-title">{t("weekly.lastN", { n: recent.length })}</p>
        {hasHistory ? (
          <>
            <div className="chart">
              {recent.map((w) => (
                <div className="cbar" key={w.week}>
                  <span className="cbar-pct">{w.pct}%</span>
                  <div className="cbar-track">
                    <div className={"cbar-fill" + (w.week === currentKey ? " current" : "")}
                      style={{ height: Math.max(3, w.pct) + "%" }} role="img"
                      aria-label={t("weekly.barAria", { week: shortDate(w.week), pct: w.pct, done: w.done, total: w.total })} />
                  </div>
                  <span className={"cbar-label" + (w.week === currentKey ? " current" : "")}>{shortDate(w.week)}</span>
                </div>
              ))}
            </div>
            <p className="chart-foot">{t("weekly.foot")}</p>
          </>
        ) : (
          <EmptyState title={t("weekly.noHistory")}
            body={t("weekly.noHistoryBody")} />
        )}
      </section>
    </div>
  );
}
