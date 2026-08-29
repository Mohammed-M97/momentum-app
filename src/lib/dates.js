/* ===== 3. dates ==========================================================
   Pure date + week math. No dependency on anything else in the app.
   ======================================================================== */

export const pad = (n) => String(n).padStart(2, "0");
export const fmtDate = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const parseDate = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
export const todayStr = () => fmtDate(new Date());
export function shiftDate(dateStr, days) {
  const d = parseDate(dateStr); d.setDate(d.getDate() + days); return fmtDate(d);
}
export const tomorrowStr = () => shiftDate(todayStr(), 1);
export function weekStartOf(dateStr, weekStart) {
  const d = parseDate(dateStr);
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return fmtDate(d);
}
export const shortDate = (s) => parseDate(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const longDate = (s) => parseDate(s).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
export function relativeLabel(s) {
  if (s === todayStr()) return "Today";
  if (s === tomorrowStr()) return "Tomorrow";
  if (s === shiftDate(todayStr(), -1)) return "Yesterday";
  return shortDate(s);
}
/* Decision 3: targetDate helper. Weeks remaining until a goal's date. */
export function weeksLeft(targetDate) {
  if (!targetDate) return null;
  const ms = parseDate(targetDate) - parseDate(todayStr());
  return Math.ceil(ms / (7 * 24 * 3600 * 1000));
}
