/* ===== 9. TasksView ======================================================
   The dedicated task management section: add, edit, move, delete tasks
   across Today / Tomorrow / any date / Backlog. TaskModal (the edit dialog)
   lives here too since it is only ever opened from this screen.
   ======================================================================== */

import { useState, useEffect, useRef } from "react";
import { EFFORT, EFFORT_KEYS } from "../lib/config.js";
import { alive, touch } from "../lib/entities.js";
import { todayStr, tomorrowStr, shiftDate, relativeLabel } from "../lib/dates.js";
import { useI18n } from "../lib/i18n.js";
import { Segmented, EmptyState, Modal, Field } from "../components/ui.jsx";
import { IconPlus, IconLeft, IconRight, IconEdit, IconTrash, IconCheck } from "../components/icons.jsx";

export function TasksView({ tasks, goals, categories, onAdd, onToggle, onEdit, onDelete, autoFocusAdd, onAutoFocused }) {
  const { t } = useI18n();
  const [bucket, setBucket] = useState("today");
  const [customDate, setCustomDate] = useState(todayStr());
  const [draft, setDraft] = useState("");
  const [effort, setEffort] = useState("low");
  const [goalId, setGoalId] = useState("");
  const inputRef = useRef(null);

  /* Opened from the "New task" shortcut on the installed app: jump
     straight into typing. Runs once, then tells App it is handled. */
  useEffect(() => {
    if (!autoFocusAdd) return;
    if (inputRef.current) inputRef.current.focus();
    if (onAutoFocused) onAutoFocused();
  }, [autoFocusAdd, onAutoFocused]);

  const activeDate = bucket === "today" ? todayStr()
    : bucket === "tomorrow" ? tomorrowStr()
    : bucket === "date" ? customDate : null;

  const list = tasks.filter((x) => alive(x) && (activeDate === null ? x.date === null : x.date === activeDate));
  const heading = activeDate === null ? t("tasks.backlog") : relativeLabel(activeDate, t);
  const headingLower = heading.toLowerCase();

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd({ title, date: activeDate, effort, goalId: goalId || null });
    setDraft("");
  };

  return (
    <div className="view">
      <div className="rule">
        <h2>{t("nav.tasks")}</h2>
        <span>{t("tasks.hint")}</span>
      </div>

      <div className="bucket-row">
        <Segmented label={t("tasks.chooseDay")} value={bucket} onChange={setBucket}
          options={[
            { value: "today", label: t("date.today") },
            { value: "tomorrow", label: t("date.tomorrow") },
            { value: "date", label: t("tasks.pickDay") },
            { value: "backlog", label: t("tasks.backlog") },
          ]} />
        {bucket === "date" && (
          <div className="date-nav">
            <button className="icon-btn" onClick={() => setCustomDate((d) => shiftDate(d, -1))} aria-label={t("tasks.prevDay")}><IconLeft size={16} className="flip-rtl" /></button>
            <input type="date" className="inp" value={customDate} aria-label={t("tasks.date")}
              onChange={(e) => { if (e.target.value) setCustomDate(e.target.value); }} />
            <button className="icon-btn" onClick={() => setCustomDate((d) => shiftDate(d, 1))} aria-label={t("tasks.nextDay")}><IconRight size={16} className="flip-rtl" /></button>
          </div>
        )}
      </div>

      <div className="add-card">
        <input ref={inputRef} className="inp grow" value={draft} placeholder={t("tasks.addTo", { heading: headingLower })}
          aria-label={t("tasks.newTitle")} enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <div className="add-opts">
          <select className="inp" value={effort} onChange={(e) => setEffort(e.target.value)} aria-label={t("tasks.effort")}>
            {EFFORT_KEYS.map((k) => <option key={k} value={k}>{t("effort." + k)}</option>)}
          </select>
          <select className="inp" value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label={t("tasks.linkGoal")}>
            <option value="">{t("common.noGoal")}</option>
            {goals.filter((g) => alive(g) && g.status !== "done").map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <button className="btn primary" onClick={submit} disabled={!draft.trim()}><IconPlus size={15} /> {t("common.add")}</button>
        </div>
      </div>

      <div className="rule">
        <h2>{heading}</h2>
        <span>{activeDate === null ? t("tasks.backlogHint") : t("tasks.dayHint")}</span>
      </div>

      {list.length === 0 ? (
        <EmptyState title={activeDate === null ? t("tasks.backlogEmpty") : t("tasks.noneFor", { heading: headingLower })}
          body={t("tasks.emptyBody")} />
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
                <span className="row-actions">
                  <button className="icon-btn" onClick={() => onEdit(x)} aria-label={t("tasks.edit") + x.title}><IconEdit size={15} /></button>
                  <button className="icon-btn danger-hover" onClick={() => onDelete(x)} aria-label={t("tasks.delete") + x.title}><IconTrash size={15} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {activeDate !== null && list.length > 5 && (
        <p className="notice">{t("tasks.tooMany", { n: list.length })}</p>
      )}
    </div>
  );
}

export function TaskModal({ task, goals, onSave, onClose }) {
  const { t } = useI18n();
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
    <Modal title={t("tasks.editTitle")} onClose={onClose} labelledBy="task-modal-title"
      footer={<>
        <button className="btn" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn primary" onClick={save} disabled={!d.title.trim()}>{t("common.save")}</button>
      </>}>
      <Field label={t("tasks.task")} htmlFor="t-title">
        <input id="t-title" className="inp full" value={d.title}
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
      </Field>
      <div className="grid-2">
        <Field label={t("tasks.effortLabel")} htmlFor="t-effort">
          <select id="t-effort" className="inp full" value={d.effort} onChange={(e) => set("effort", e.target.value)}>
            {EFFORT_KEYS.map((k) => <option key={k} value={k}>{t("effort." + k)}</option>)}
          </select>
        </Field>
        <Field label={t("tasks.goal")} htmlFor="t-goal">
          <select id="t-goal" className="inp full" value={d.goalId} onChange={(e) => set("goalId", e.target.value)}>
            <option value="">{t("common.noGoal")}</option>
            {goals.filter(alive).map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("tasks.when")}>
        <Segmented label={t("tasks.schedule")} value={d.schedule} onChange={(v) => set("schedule", v)}
          options={[{ value: "date", label: t("tasks.onDay") }, { value: "backlog", label: t("tasks.backlog") }]} />
      </Field>
      {d.schedule === "date" && (
        <div className="quick-dates">
          <input type="date" className="inp" value={d.date} aria-label={t("tasks.date")}
            onChange={(e) => { if (e.target.value) set("date", e.target.value); }} />
          <button className="chip" onClick={() => set("date", todayStr())}>{t("date.today")}</button>
          <button className="chip" onClick={() => set("date", tomorrowStr())}>{t("date.tomorrow")}</button>
        </div>
      )}
    </Modal>
  );
}
