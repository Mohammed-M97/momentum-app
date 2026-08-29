/* ===== 12. RoadmapView ===================================================
   Multiple roadmaps, each with reorderable phases and steps. Phases and
   items are embedded inside the roadmap document, so editing any of them
   touches the whole roadmap entity (one updatedAt for the document).
   ======================================================================== */

import { useState, useEffect } from "react";
import { alive, touch, newEntity, uid } from "../lib/entities.js";
import { Bar, EmptyState } from "../components/ui.jsx";
import { IconPlus, IconUp, IconDown, IconEdit, IconTrash, IconCheck } from "../components/icons.jsx";

export function RoadmapView({ roadmaps, onChange, onRequestDelete, onRequestDeletePhase }) {
  const liveMaps = roadmaps.filter(alive);
  const [activeId, setActiveId] = useState(liveMaps[0] ? liveMaps[0].id : null);
  const [editing, setEditing] = useState(null);
  const [newPhase, setNewPhase] = useState("");
  const [newItem, setNewItem] = useState({});

  useEffect(() => {
    if (!liveMaps.some((r) => r.id === activeId)) setActiveId(liveMaps[0] ? liveMaps[0].id : null);
  }, [roadmaps]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = liveMaps.find((r) => r.id === activeId) || liveMaps[0] || null;

  /* Phases and items are embedded inside the roadmap document, so editing
     any of them touches the roadmap entity (one updatedAt for the whole
     document; that is also how it will live in MongoDB). */
  const update = (fn) => onChange(roadmaps.map((r) => (r.id === active.id ? touch(fn(r)) : r)));

  const addRoadmap = () => {
    const r = newEntity({ title: "Untitled roadmap", phases: [] });
    onChange(roadmaps.concat([r]));
    setActiveId(r.id);
    setEditing({ type: "roadmap", id: r.id, value: r.title });
  };
  const addPhase = () => {
    const title = newPhase.trim(); if (!title) return;
    update((r) => ({ ...r, phases: r.phases.concat([{ id: uid(), title, items: [] }]) }));
    setNewPhase("");
  };
  const movePhase = (i, dir) => update((r) => {
    const p = r.phases.slice(); const j = i + dir;
    if (j < 0 || j >= p.length) return r;
    const t = p[i]; p[i] = p[j]; p[j] = t;
    return { ...r, phases: p };
  });
  const addItem = (phaseId) => {
    const text = (newItem[phaseId] || "").trim(); if (!text) return;
    update((r) => ({ ...r, phases: r.phases.map((p) => p.id === phaseId
      ? { ...p, items: p.items.concat([{ id: uid(), text, done: false }]) } : p) }));
    setNewItem((s) => ({ ...s, [phaseId]: "" }));
  };
  const toggleItem = (phaseId, itemId) => update((r) => ({ ...r,
    phases: r.phases.map((p) => (p.id !== phaseId ? p
      : { ...p, items: p.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)) })) }));
  const deleteItem = (phaseId, itemId) => update((r) => ({ ...r,
    phases: r.phases.map((p) => (p.id !== phaseId ? p : { ...p, items: p.items.filter((it) => it.id !== itemId) })) }));
  const moveItem = (phaseId, i, dir) => update((r) => ({ ...r,
    phases: r.phases.map((p) => {
      if (p.id !== phaseId) return p;
      const items = p.items.slice(); const j = i + dir;
      if (j < 0 || j >= items.length) return p;
      const t = items[i]; items[i] = items[j]; items[j] = t;
      return { ...p, items };
    }) }));

  const isEditing = (type, id) => editing && editing.type === type && editing.id === id;
  const commit = () => {
    if (!editing) return;
    const value = editing.value.trim();
    if (value) {
      if (editing.type === "roadmap") update((r) => ({ ...r, title: value }));
      if (editing.type === "phase") update((r) => ({ ...r, phases: r.phases.map((p) => (p.id === editing.id ? { ...p, title: value } : p)) }));
      if (editing.type === "item") update((r) => ({ ...r, phases: r.phases.map((p) => (p.id !== editing.phaseId ? p
        : { ...p, items: p.items.map((it) => (it.id === editing.id ? { ...it, text: value } : it)) })) }));
    }
    setEditing(null);
  };
  const editKeys = (e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(null); };

  if (!active) {
    return (
      <div className="view">
        <EmptyState title="No roadmaps" body="A roadmap is the long path, broken into phases you can tick off."
          action={<button className="btn primary" onClick={addRoadmap}><IconPlus size={14} /> New roadmap</button>} />
      </div>
    );
  }

  const totalItems = active.phases.reduce((n, p) => n + p.items.length, 0);
  const doneItems = active.phases.reduce((n, p) => n + p.items.filter((i) => i.done).length, 0);

  return (
    <div className="view">
      <div className="rule">
        <h2>Roadmaps</h2>
        <span>{doneItems} of {totalItems} steps done</span>
        <button className="btn primary sm push" onClick={addRoadmap}><IconPlus size={14} /> New roadmap</button>
      </div>

      {liveMaps.length > 1 && (
        <div className="tab-chips" role="tablist" aria-label="Select a roadmap">
          {liveMaps.map((r) => (
            <button key={r.id} role="tab" aria-selected={r.id === active.id}
              className={"chip" + (r.id === active.id ? " on" : "")}
              onClick={() => setActiveId(r.id)}>{r.title}</button>
          ))}
        </div>
      )}

      <div className="roadmap-head">
        {isEditing("roadmap", active.id) ? (
          <input className="inp title-inp" autoFocus value={editing.value} aria-label="Roadmap name"
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            onBlur={commit} onKeyDown={editKeys} />
        ) : (
          <h3 className="roadmap-title">{active.title}</h3>
        )}
        <span className="row-actions">
          <button className="icon-btn" aria-label="Rename roadmap"
            onClick={() => setEditing({ type: "roadmap", id: active.id, value: active.title })}><IconEdit size={15} /></button>
          <button className="icon-btn danger-hover" aria-label="Delete roadmap"
            onClick={() => onRequestDelete(active)}><IconTrash size={15} /></button>
        </span>
      </div>
      <Bar pct={totalItems ? (doneItems / totalItems) * 100 : 0} color="var(--accent)" />

      {active.phases.length === 0 && (
        <div className="pad-top">
          <EmptyState title="No phases yet" body="Break the goal into stages. Each stage holds the steps you tick off." />
        </div>
      )}

      {active.phases.map((phase, pi) => {
        const done = phase.items.filter((i) => i.done).length;
        const pct = phase.items.length ? Math.round((done / phase.items.length) * 100) : 0;
        return (
          <section className="phase" key={phase.id}>
            <header className="phase-head">
              <span className="phase-num">{pi + 1}</span>
              {isEditing("phase", phase.id) ? (
                <input className="inp title-inp" autoFocus value={editing.value} aria-label="Phase name"
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  onBlur={commit} onKeyDown={editKeys} />
              ) : (
                <h3 className="phase-title">{phase.title}</h3>
              )}
              <span className="phase-count">{done}/{phase.items.length}</span>
              <span className="row-actions">
                <button className="icon-btn" onClick={() => movePhase(pi, -1)} disabled={pi === 0} aria-label={"Move phase up: " + phase.title}><IconUp size={15} /></button>
                <button className="icon-btn" onClick={() => movePhase(pi, 1)} disabled={pi === active.phases.length - 1} aria-label={"Move phase down: " + phase.title}><IconDown size={15} /></button>
                <button className="icon-btn" onClick={() => setEditing({ type: "phase", id: phase.id, value: phase.title })} aria-label={"Rename phase: " + phase.title}><IconEdit size={15} /></button>
                <button className="icon-btn danger-hover"
                  onClick={() => onRequestDeletePhase(phase, () => update((r) => ({ ...r, phases: r.phases.filter((p) => p.id !== phase.id) })))}
                  aria-label={"Delete phase: " + phase.title}><IconTrash size={15} /></button>
              </span>
            </header>
            <Bar pct={pct} color="var(--accent)" height={5} />

            <ul className="phase-items">
              {phase.items.map((item, ii) => (
                <li className={"ritem" + (item.done ? " done" : "")} key={item.id}>
                  <button className={"check sm" + (item.done ? " on" : "")} onClick={() => toggleItem(phase.id, item.id)}
                    aria-pressed={item.done} aria-label={(item.done ? "Mark not done: " : "Mark done: ") + item.text}>
                    {item.done && <IconCheck size={11} />}
                  </button>
                  {isEditing("item", item.id) ? (
                    <input className="inp grow" autoFocus value={editing.value} aria-label="Step text"
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      onBlur={commit} onKeyDown={editKeys} />
                  ) : (
                    <span className="ritem-text">{item.text}</span>
                  )}
                  <span className="row-actions">
                    <button className="icon-btn" onClick={() => moveItem(phase.id, ii, -1)} disabled={ii === 0} aria-label="Move step up"><IconUp size={14} /></button>
                    <button className="icon-btn" onClick={() => moveItem(phase.id, ii, 1)} disabled={ii === phase.items.length - 1} aria-label="Move step down"><IconDown size={14} /></button>
                    <button className="icon-btn" onClick={() => setEditing({ type: "item", id: item.id, phaseId: phase.id, value: item.text })} aria-label={"Rename step: " + item.text}><IconEdit size={14} /></button>
                    <button className="icon-btn danger-hover" onClick={() => deleteItem(phase.id, item.id)} aria-label={"Delete step: " + item.text}><IconTrash size={14} /></button>
                  </span>
                </li>
              ))}
            </ul>

            <div className="inline-add">
              <input className="inp grow" placeholder="Add a step" value={newItem[phase.id] || ""}
                aria-label={"New step in " + phase.title}
                onChange={(e) => setNewItem((s) => ({ ...s, [phase.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(phase.id); }} />
              <button className="btn sm" onClick={() => addItem(phase.id)}>Add step</button>
            </div>
          </section>
        );
      })}

      <div className="inline-add standalone">
        <input className="inp grow" placeholder="Add a phase" value={newPhase} aria-label="New phase name"
          onChange={(e) => setNewPhase(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addPhase(); }} />
        <button className="btn primary sm" onClick={addPhase}><IconPlus size={14} /> Add phase</button>
      </div>
    </div>
  );
}
