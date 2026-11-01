/* ===== 10. GoalsView =====================================================
   Decision 4 applied: progress is DERIVED, there is no stored number.
   This module holds the Goals screen plus its GoalCard, the GoalModal
   (new/edit goal), and the CategoryModal (Decision 2: user owns categories).
   ======================================================================== */

import { useState } from "react";
import { GOAL_STATUS } from "../lib/config.js";
import { useI18n } from "../lib/i18n.js";
import { alive, touch, newEntity, nowISO } from "../lib/entities.js";
import { weeksLeft } from "../lib/dates.js";
import { Bar, CatChip, EmptyState, Segmented, Modal, Field } from "../components/ui.jsx";
import { IconPlus, IconEdit, IconTrash, IconTag } from "../components/icons.jsx";

/* HARD CONCEPT: derived state --------------------------------------------
   We never store "35%". We look at the tasks linked to this goal and
   compute done/total at render time. That means the number can never get
   out of sync with reality, and your backend never needs a progress
   column; GET /goals/:id/progress is just a COUNT query (or the client
   computes it from tasks it already has, like here).
   ----------------------------------------------------------------------- */
export function goalProgress(goal, tasks) {
  const linked = tasks.filter((t) => alive(t) && t.goalId === goal.id);
  const done = linked.filter((t) => t.done).length;
  return { total: linked.length, done, pct: linked.length ? Math.round((done / linked.length) * 100) : 0 };
}

function GoalCard({ goal, tasks, categories, onEdit, onDelete, onStatus }) {
  const { t } = useI18n();
  const cat = categories.find((c) => c.id === goal.categoryId && alive(c)) || null;
  const color = cat ? cat.color : "var(--accent)";
  const prog = goalProgress(goal, tasks);
  const wl = weeksLeft(goal.targetDate);
  return (
    <article className={"goal status-" + goal.status}>
      <header className="goal-head">
        <CatChip cat={cat} />
        {goal.targetDate && (
          <span className={"goal-horizon" + (wl !== null && wl < 0 ? " overdue" : "")}>
            {wl === null ? "" : wl < 0 ? t("goals.overdue", { n: Math.abs(wl) }) : wl === 0 ? t("goals.thisWeek") : t("goals.left", { n: wl })}
          </span>
        )}
        <span className="row-actions">
          <button className="icon-btn" onClick={() => onEdit(goal)} aria-label={t("goals.edit") + goal.title}><IconEdit size={15} /></button>
          <button className="icon-btn danger-hover" onClick={() => onDelete(goal)} aria-label={t("goals.delete") + goal.title}><IconTrash size={15} /></button>
        </span>
      </header>
      <h3 className="goal-title">{goal.title}</h3>
      {goal.why && <p className="goal-why">{goal.why}</p>}
      <Bar pct={prog.pct} color={color} />
      <div className="goal-foot">
        <span className="prog-read" style={{ color }}>
          {prog.total === 0 ? t("goals.noLinked") : t("goals.progress", prog)}
        </span>
        <select className="status-select" value={goal.status} aria-label={t("goals.statusFor") + goal.title}
          onChange={(e) => onStatus(goal.id, e.target.value)}>
          {Object.keys(GOAL_STATUS).map((k) => <option key={k} value={k}>{t("status." + k)}</option>)}
        </select>
      </div>
      {prog.total === 0 && (
        <p className="goal-hint">{t("goals.hint")}</p>
      )}
    </article>
  );
}

export function GoalsView({ goals, tasks, categories, onNew, onEdit, onDelete, onStatus, onManageCats }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("active");
  const liveGoals = goals.filter(alive);
  const shown = liveGoals.filter((g) => (filter === "all" ? true : g.status === filter));
  return (
    <div className="view">
      <div className="rule">
        <h2>{t("nav.goals")}</h2>
        <span>{t("goals.active", { n: liveGoals.filter((g) => g.status === "active").length })}</span>
        <span className="row-actions push">
          <button className="btn sm" onClick={onManageCats}><IconTag size={14} /> {t("goals.categories")}</button>
          <button className="btn primary sm" onClick={onNew}><IconPlus size={14} /> {t("goals.new")}</button>
        </span>
      </div>
      <Segmented label={t("goals.filter")} value={filter} onChange={setFilter}
        options={[
          { value: "active", label: t("status.active") },
          { value: "paused", label: t("status.paused") },
          { value: "done", label: t("status.done") },
          { value: "all", label: t("status.all") },
        ]} />
      {shown.length === 0 ? (
        <div className="pad-top">
          <EmptyState title={filter === "active" ? t("goals.noActive") : t("goals.nothing")}
            body={t("goals.emptyBody")}
            action={<button className="btn primary" onClick={onNew}><IconPlus size={14} /> {t("goals.new")}</button>} />
        </div>
      ) : (
        <div className="goal-grid">
          {shown.map((g) => (
            <GoalCard key={g.id} goal={g} tasks={tasks} categories={categories}
              onEdit={onEdit} onDelete={onDelete} onStatus={onStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalModal({ goal, categories, onSave, onClose }) {
  const { t } = useI18n();
  const liveCats = categories.filter(alive);
  const [d, setD] = useState({
    title: goal ? goal.title : "",
    categoryId: goal ? goal.categoryId : (liveCats[0] ? liveCats[0].id : null),
    targetDate: goal && goal.targetDate ? goal.targetDate : "",
    why: goal ? goal.why : "",
    status: goal ? goal.status : "active",
  });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!d.title.trim()) return;
    onSave({ ...d, title: d.title.trim(), targetDate: d.targetDate || null });
  };
  return (
    <Modal title={goal ? t("goals.editTitle") : t("goals.new")} onClose={onClose} labelledBy="goal-modal-title"
      footer={<>
        <button className="btn" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn primary" onClick={save} disabled={!d.title.trim()}>{goal ? t("common.save") : t("goals.addGoal")}</button>
      </>}>
      <Field label={t("goals.goal")} htmlFor="g-title">
        <input id="g-title" className="inp full" value={d.title} placeholder={t("goals.goalPh")}
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
      </Field>
      <div className="grid-2">
        <Field label={t("goals.category")} htmlFor="g-cat">
          <select id="g-cat" className="inp full" value={d.categoryId || ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">{t("common.none")}</option>
            {liveCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("goals.target")} hint={t("common.optional")} htmlFor="g-date">
          <input id="g-date" type="date" className="inp full" value={d.targetDate}
            onChange={(e) => set("targetDate", e.target.value)} />
        </Field>
      </div>
      <Field label={t("goals.why")} hint={t("goals.whyHint")} htmlFor="g-why">
        <textarea id="g-why" className="inp full" rows={2} value={d.why}
          placeholder={t("goals.whyPh")}
          onChange={(e) => set("why", e.target.value)} />
      </Field>
      <Field label={t("goals.status")} htmlFor="g-status">
        <select id="g-status" className="inp full" value={d.status} onChange={(e) => set("status", e.target.value)}>
          {Object.keys(GOAL_STATUS).map((k) => <option key={k} value={k}>{t("status." + k)}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

/* Decision 2 UI: the user owns the category list. */
export function CategoryModal({ categories, onChange, onClose }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b6fd8");
  const liveCats = categories.filter(alive);
  const add = () => {
    const n = name.trim();
    if (!n) return;
    onChange(categories.concat([newEntity({ name: n, color })]));
    setName("");
  };
  const rename = (id, n) => onChange(categories.map((c) => (c.id === id ? touch(c, { name: n }) : c)));
  const recolor = (id, col) => onChange(categories.map((c) => (c.id === id ? touch(c, { color: col }) : c)));
  const remove = (id) => onChange(categories.map((c) => (c.id === id ? touch(c, { deletedAt: nowISO() }) : c)));
  return (
    <Modal title={t("goals.categories")} onClose={onClose} labelledBy="cat-modal-title"
      footer={<button className="btn primary" onClick={onClose}>{t("common.done")}</button>}>
      <p className="confirm-msg">{t("cats.intro")}</p>
      <ul className="cat-list">
        {liveCats.map((c) => (
          <li key={c.id} className="cat-row">
            <input type="color" className="color-inp" value={c.color} aria-label={t("cats.colorFor") + c.name}
              onChange={(e) => recolor(c.id, e.target.value)} />
            <input className="inp grow" value={c.name} aria-label={t("cats.name")}
              onChange={(e) => rename(c.id, e.target.value)} />
            <button className="icon-btn danger-hover" onClick={() => remove(c.id)} aria-label={t("cats.delete") + c.name}><IconTrash size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="inline-add">
        <input type="color" className="color-inp" value={color} aria-label={t("cats.newColor")}
          onChange={(e) => setColor(e.target.value)} />
        <input className="inp grow" value={name} placeholder={t("cats.newPh")} aria-label={t("cats.newName")}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn sm" onClick={add} disabled={!name.trim()}>{t("common.add")}</button>
      </div>
    </Modal>
  );
}
