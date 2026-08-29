/* ===== 9. TasksView ======================================================
   The dedicated task management section: add, edit, move, delete tasks
   across Today / Tomorrow / any date / Backlog. TaskModal (the edit dialog)
   lives here too since it is only ever opened from this screen.
   ======================================================================== */

import { useState } from "react";
import { EFFORT, EFFORT_KEYS } from "../lib/config.js";
import { alive, touch } from "../lib/entities.js";
import { todayStr, tomorrowStr, shiftDate, relativeLabel } from "../lib/dates.js";
import { Segmented, EmptyState, Modal, Field } from "../components/ui.jsx";
import { IconPlus, IconLeft, IconRight, IconEdit, IconTrash, IconCheck } from "../components/icons.jsx";

export function TasksView({ tasks, goals, categories, onAdd, onToggle, onEdit, onDelete }) {
  const [bucket, setBucket] = useState("today");
  const [customDate, setCustomDate] = useState(todayStr());
  const [draft, setDraft] = useState("");
  const [effort, setEffort] = useState("low");
  const [goalId, setGoalId] = useState("");

  const activeDate = bucket === "today" ? todayStr()
    : bucket === "tomorrow" ? tomorrowStr()
    : bucket === "date" ? customDate : null;

  const list = tasks.filter((t) => alive(t) && (activeDate === null ? t.date === null : t.date === activeDate));
  const heading = activeDate === null ? "Backlog" : relativeLabel(activeDate);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd({ title, date: activeDate, effort, goalId: goalId || null });
    setDraft("");
  };

  return (
    <div className="view">
      <div className="rule">
        <h2>Tasks</h2>
        <span>plan the work, then live in Today</span>
      </div>

      <div className="bucket-row">
        <Segmented label="Choose which day to plan" value={bucket} onChange={setBucket}
          options={[
            { value: "today", label: "Today" },
            { value: "tomorrow", label: "Tomorrow" },
            { value: "date", label: "Pick a day" },
            { value: "backlog", label: "Backlog" },
          ]} />
        {bucket === "date" && (
          <div className="date-nav">
            <button className="icon-btn" onClick={() => setCustomDate((d) => shiftDate(d, -1))} aria-label="Previous day"><IconLeft size={16} /></button>
            <input type="date" className="inp" value={customDate} aria-label="Task date"
              onChange={(e) => { if (e.target.value) setCustomDate(e.target.value); }} />
            <button className="icon-btn" onClick={() => setCustomDate((d) => shiftDate(d, 1))} aria-label="Next day"><IconRight size={16} /></button>
          </div>
        )}
      </div>

      <div className="add-card">
        <input className="inp grow" value={draft} placeholder={"Add a task to " + heading.toLowerCase()}
          aria-label="New task title"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <select className="inp" value={effort} onChange={(e) => setEffort(e.target.value)} aria-label="Effort estimate">
          {EFFORT_KEYS.map((k) => <option key={k} value={k}>{EFFORT[k].label}</option>)}
        </select>
        <select className="inp" value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label="Link to a goal">
          <option value="">No goal</option>
          {goals.filter((g) => alive(g) && g.status !== "done").map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <button className="btn primary" onClick={submit} disabled={!draft.trim()}><IconPlus size={15} /> Add</button>
      </div>

      <div className="rule">
        <h2>{heading}</h2>
        <span>{activeDate === null ? "unscheduled ideas, schedule them when you have room" : "five or fewer keeps it doable"}</span>
      </div>

      {list.length === 0 ? (
        <EmptyState title={activeDate === null ? "Backlog is empty" : "No tasks for " + heading.toLowerCase()}
          body="Add one above. Small and specific beats big and vague." />
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
                <span className="row-actions">
                  <button className="icon-btn" onClick={() => onEdit(t)} aria-label={"Edit task: " + t.title}><IconEdit size={15} /></button>
                  <button className="icon-btn danger-hover" onClick={() => onDelete(t)} aria-label={"Delete task: " + t.title}><IconTrash size={15} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {activeDate !== null && list.length > 5 && (
        <p className="notice">{list.length} tasks on one day. Move the least urgent to tomorrow or the backlog.</p>
      )}
    </div>
  );
}

export function TaskModal({ task, goals, onSave, onClose }) {
  const [d, setD] = useState({
    title: task.title, effort: task.effort, goalId: task.goalId || "",
    schedule: task.date === null ? "backlog" : "date", date: task.date || todayStr(),
  });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    const title = d.title.trim();
    if (!title) return;
    onSave(touch(task, { title, effort: d.effort, goalId: d.goalId || null,
      date: d.schedule === "backlog" ? null : d.date }));
  };
  return (
    <Modal title="Edit task" onClose={onClose} labelledBy="task-modal-title"
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save} disabled={!d.title.trim()}>Save changes</button>
      </>}>
      <Field label="Task" htmlFor="t-title">
        <input id="t-title" className="inp full" value={d.title}
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
      </Field>
      <div className="grid-2">
        <Field label="Effort" htmlFor="t-effort">
          <select id="t-effort" className="inp full" value={d.effort} onChange={(e) => set("effort", e.target.value)}>
            {EFFORT_KEYS.map((k) => <option key={k} value={k}>{EFFORT[k].label}</option>)}
          </select>
        </Field>
        <Field label="Goal" htmlFor="t-goal">
          <select id="t-goal" className="inp full" value={d.goalId} onChange={(e) => set("goalId", e.target.value)}>
            <option value="">No goal</option>
            {goals.filter(alive).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </Field>
      </div>
      <Field label="When">
        <Segmented label="Schedule" value={d.schedule} onChange={(v) => set("schedule", v)}
          options={[{ value: "date", label: "On a day" }, { value: "backlog", label: "Backlog" }]} />
      </Field>
      {d.schedule === "date" && (
        <div className="quick-dates">
          <input type="date" className="inp" value={d.date} aria-label="Task date"
            onChange={(e) => { if (e.target.value) set("date", e.target.value); }} />
          <button className="chip" onClick={() => set("date", todayStr())}>Today</button>
          <button className="chip" onClick={() => set("date", tomorrowStr())}>Tomorrow</button>
        </div>
      )}
    </Modal>
  );
}
