/* ===== 2. entity helpers =================================================
   The "entity envelope" every record in the app shares.
   ======================================================================== */

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const nowISO = () => new Date().toISOString();

/* HARD CONCEPT: entity envelope -----------------------------------------
   Decision 1. Every record is born with an id and three timestamps.
   - createdAt never changes.
   - updatedAt changes on EVERY edit (see touch below). When you build the
     backend, this field is how two devices decide who has the newer copy
     of a record ("last write wins" sync needs it).
   - deletedAt is null while the record is alive. Deleting = setting this
     to a date (Decision 5, soft delete). The record stays in storage, the
     UI just filters it out with alive(). Your backend keeps deleted rows
     too, which makes sync and "undo" possible later.
   ----------------------------------------------------------------------- */
export function newEntity(fields) {
  const t = nowISO();
  return { id: uid(), createdAt: t, updatedAt: t, deletedAt: null, ...fields };
}
export function touch(entity, changes) {
  return { ...entity, ...changes, updatedAt: nowISO() };
}
export const alive = (e) => !e.deletedAt;
