/* ===== 10. GoalsView =====================================================
   Decision 4 applied: progress is DERIVED, there is no stored number.
   This module holds the Goals screen plus its GoalCard, the GoalModal
   (new/edit goal), and the CategoryModal (Decision 2: user owns categories).
   ======================================================================== */

import { useState } from "react";
import { GOAL_STATUS } from "../lib/config.js";
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
            {wl === null ? "" : wl < 0 ? Math.abs(wl) + "w overdue" : wl === 0 ? "this week" : wl + "w left"}
          </span>
        )}
        <span className="row-actions">
          <button className="icon-btn" onClick={() => onEdit(goal)} aria-label={"Edit goal: " + goal.title}><IconEdit size={15} /></button>
          <button className="icon-btn danger-hover" onClick={() => onDelete(goal)} aria-label={"Delete goal: " + goal.title}><IconTrash size={15} /></button>
        </span>
      </header>
      <h3 className="goal-title">{goal.title}</h3>
      {goal.why && <p className="goal-why">{goal.why}</p>}
      <Bar pct={prog.pct} color={color} />
      <div className="goal-foot">
        <span className="prog-read" style={{ color }}>
          {prog.total === 0 ? "no linked tasks yet" : prog.pct + "% (" + prog.done + " of " + prog.total + " tasks)"}
        </span>
        <select className="status-select" value={goal.status} aria-label={"Status for " + goal.title}
          onChange={(e) => onStatus(goal.id, e.target.value)}>
          {Object.keys(GOAL_STATUS).map((k) => <option key={k} value={k}>{GOAL_STATUS[k]}</option>)}
        </select>
      </div>
      {prog.total === 0 && (
        <p className="goal-hint">Progress is measured by linked tasks. Add tasks in the Tasks tab and link them to this goal.</p>
      )}
    </article>
  );
}

export function GoalsView({ goals, tasks, categories, onNew, onEdit, onDelete, onStatus, onManageCats }) {
  const [filter, setFilter] = useState("active");
  const liveGoals = goals.filter(alive);
  const shown = liveGoals.filter((g) => (filter === "all" ? true : g.status === filter));
  return (
    <div className="view">
      <div className="rule">
        <h2>Goals</h2>
        <span>{liveGoals.filter((g) => g.status === "active").length} active</span>
        <span className="row-actions push">
          <button className="btn sm" onClick={onManageCats}><IconTag size={14} /> Categories</button>
          <button className="btn primary sm" onClick={onNew}><IconPlus size={14} /> New goal</button>
        </span>
      </div>
      <Segmented label="Filter goals by status" value={filter} onChange={setFilter}
        options={[
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "done", label: "Done" },
          { value: "all", label: "All" },
        ]} />
      {shown.length === 0 ? (
        <div className="pad-top">
          <EmptyState title={filter === "active" ? "No active goals" : "Nothing here"}
            body="A goal is the reason a small task is worth doing."
            action={<button className="btn primary" onClick={onNew}><IconPlus size={14} /> New goal</button>} />
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
    <Modal title={goal ? "Edit goal" : "New goal"} onClose={onClose} labelledBy="goal-modal-title"
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={!d.title.trim()}>{goal ? "Save changes" : "Add goal"}</button>
      </>}>
      <Field label="Goal" htmlFor="g-title">
        <input id="g-title" className="inp full" value={d.title} placeholder="Learn Express and REST APIs"
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
      </Field>
      <div className="grid-2">
        <Field label="Category" htmlFor="g-cat">
          <select id="g-cat" className="inp full" value={d.categoryId || ""} onChange={(e) => set("categoryId", e.target.value || null)}>
            <option value="">None</option>
            {liveCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Target date" hint="optional" htmlFor="g-date">
          <input id="g-date" type="date" className="inp full" value={d.targetDate}
            onChange={(e) => set("targetDate", e.target.value)} />
        </Field>
      </div>
      <Field label="Why this matters" hint="read it when motivation drops" htmlFor="g-why">
        <textarea id="g-why" className="inp full" rows={2} value={d.why}
          placeholder="The real reason you set this goal."
          onChange={(e) => set("why", e.target.value)} />
      </Field>
      <Field label="Status" htmlFor="g-status">
        <select id="g-status" className="inp full" value={d.status} onChange={(e) => set("status", e.target.value)}>
          {Object.keys(GOAL_STATUS).map((k) => <option key={k} value={k}>{GOAL_STATUS[k]}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

/* Decision 2 UI: the user owns the category list. */
export function CategoryModal({ categories, onChange, onClose }) {
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
    <Modal title="Categories" onClose={onClose} labelledBy="cat-modal-title"
      footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      <p className="confirm-msg">Categories are yours to shape. Goals keep working if you delete their category; they just lose the label.</p>
      <ul className="cat-list">
        {liveCats.map((c) => (
          <li key={c.id} className="cat-row">
            <input type="color" className="color-inp" value={c.color} aria-label={"Color for " + c.name}
              onChange={(e) => recolor(c.id, e.target.value)} />
            <input className="inp grow" value={c.name} aria-label="Category name"
              onChange={(e) => rename(c.id, e.target.value)} />
            <button className="icon-btn danger-hover" onClick={() => remove(c.id)} aria-label={"Delete category: " + c.name}><IconTrash size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="inline-add">
        <input type="color" className="color-inp" value={color} aria-label="New category color"
          onChange={(e) => setColor(e.target.value)} />
        <input className="inp grow" value={name} placeholder="New category" aria-label="New category name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <button className="btn sm" onClick={add} disabled={!name.trim()}>Add</button>
      </div>
    </Modal>
  );
}
