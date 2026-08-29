/* ===== 11. WeeklyView ====================================================
   Pure read-only stats. Everything on this screen is computed from tasks;
   there is nothing to fill in and nothing of its own to store.
   ======================================================================== */

import { useMemo } from "react";
import { alive } from "../lib/entities.js";
import { weekStartOf, todayStr, shortDate } from "../lib/dates.js";
import { EmptyState } from "../components/ui.jsx";

export function WeeklyView({ tasks, weekStart }) {
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
        <h2>Weekly momentum</h2>
        <span>calculated from your tasks, nothing to fill in</span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <p className="stat-label">This week</p>
          <p className="stat-value">{thisWeek.pct}%</p>
          {delta !== null
            ? <p className={"stat-sub " + (delta >= 0 ? "up" : "down")}>{delta >= 0 ? "+" : ""}{delta}% vs last week</p>
            : <p className="stat-sub muted">{thisWeek.done} of {thisWeek.total} done</p>}
        </div>
        <div className="stat">
          <p className="stat-label">Tasks finished</p>
          <p className="stat-value">{thisWeek.done}</p>
          <p className="stat-sub muted">{lastWeek ? lastWeek.done + " last week" : "this week"}</p>
        </div>
        <div className="stat">
          <p className="stat-label">Last week</p>
          <p className="stat-value">{lastWeek ? lastWeek.pct + "%" : "--"}</p>
          <p className="stat-sub muted">{lastWeek ? "your baseline" : "no data yet"}</p>
        </div>
      </div>

      <section className="chart-card" aria-label="Weekly completion chart">
        <p className="chart-title">Last {recent.length} week{recent.length === 1 ? "" : "s"}</p>
        {hasHistory ? (
          <>
            <div className="chart">
              {recent.map((w) => (
                <div className="cbar" key={w.week}>
                  <span className="cbar-pct">{w.pct}%</span>
                  <div className="cbar-track">
                    <div className={"cbar-fill" + (w.week === currentKey ? " current" : "")}
                      style={{ height: Math.max(3, w.pct) + "%" }} role="img"
                      aria-label={"Week of " + shortDate(w.week) + ": " + w.pct + " percent, " + w.done + " of " + w.total + " tasks"} />
                  </div>
                  <span className={"cbar-label" + (w.week === currentKey ? " current" : "")}>{shortDate(w.week)}</span>
                </div>
              ))}
            </div>
            <p className="chart-foot">Each bar is the share of that week's tasks you finished. The filled bar is this week.</p>
          </>
        ) : (
          <EmptyState title="No history yet"
            body="Finish a few tasks and this chart fills itself in. One week of real data beats any starting number." />
        )}
      </section>
    </div>
  );
}
