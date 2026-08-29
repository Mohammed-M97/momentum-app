/* ===== 7. shared UI ======================================================
   The reusable building blocks every view is assembled from: Modal,
   ConfirmDialog, Bar, EmptyState, Segmented, Field, CatChip.
   ======================================================================== */

import { useEffect, useRef } from "react";
import { IconClose } from "./icons.jsx";

export function Modal({ title, onClose, children, footer, labelledBy = "modal-title" }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const focusables = () => Array.from(node.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusables()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const a = list[0], b = list[list.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="modal-head">
          <h2 className="modal-title" id={labelledBy}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><IconClose size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel, extraActions }) {
  return (
    <Modal title={title} onClose={onCancel} labelledBy="confirm-title"
      footer={<>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
      </>}>
      <p className="confirm-msg">{message}</p>
      {extraActions}
    </Modal>
  );
}

export const Bar = ({ pct, color, height = 7 }) => (
  <div className="bar" style={{ height }}>
    <div className="bar-fill" style={{ width: Math.max(0, Math.min(100, pct)) + "%", background: color }} />
  </div>
);

export const EmptyState = ({ title, body, action }) => (
  <div className="empty">
    <div className="empty-title">{title}</div>
    <p className="empty-body">{body}</p>
    {action}
  </div>
);

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={"seg" + (value === o.value ? " on" : "")}
          aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}{hint && <span className="field-hint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* Category chip. Color comes from user data; translucent bg derived from it. */
export const CatChip = ({ cat }) => cat ? (
  <span className="chip-cat" style={{ background: cat.color + "26", color: cat.color }}>{cat.name}</span>
) : null;
