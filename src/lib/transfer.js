/* ===== 16. transfer ======================================================
   Export / import the entire dataset as one JSON file.

   Until there is a backend, this is the only way to back up your data or
   move it to another browser or machine: localStorage disappears the moment
   you clear browsing data.

   BACKEND HOOK: migration path -------------------------------------------
   The envelope below (app + version + exportedAt + data) is also the
   easiest thing for your first real API to accept. A single
   POST /api/import that takes this exact shape lets an existing local user
   move their data into their new account in one request. Keep the version
   field: it is how a future you knows how to read an old file.
   ----------------------------------------------------------------------- */

import { todayStr } from "./dates.js";

export const EXPORT_VERSION = 3;

/* Wraps the five collections in a versioned envelope. */
export function buildExport({ profile, categories, goals, tasks, roadmaps }) {
  return {
    app: "momentum",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: { profile, categories, goals, tasks, roadmaps },
  };
}

export const exportFilename = () => "momentum-backup-" + todayStr() + ".json";

/* Turns a JS value into a file the browser downloads. createObjectURL makes
   a temporary in-memory URL for the blob; revoking it afterwards frees it. */
export function downloadJSON(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* FileReader is callback based; wrapping it in a Promise lets the caller
   just `await` it. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsText(file);
  });
}

/* Validates an uploaded backup and returns the five collections.

   Never trust a file the user picked: it could be any JSON, a truncated
   download, or a backup from a different app. Every throw below carries a
   message that is safe to show in the UI. Strict about shape, forgiving
   about collections that are simply absent. */
export function parseImport(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("That file is not valid JSON."); }

  if (!parsed || typeof parsed !== "object") throw new Error("That file is empty or not a backup.");
  if (parsed.app !== "momentum") throw new Error("That is not a Momentum backup file.");

  const d = parsed.data;
  if (!d || typeof d !== "object") throw new Error("That backup has no data in it.");

  const list = (v, name) => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw new Error("The " + name + " in that backup are damaged.");
    return v;
  };

  return {
    profile: d.profile && typeof d.profile === "object" ? d.profile : {},
    categories: list(d.categories, "categories"),
    goals: list(d.goals, "goals"),
    tasks: list(d.tasks, "tasks"),
    roadmaps: list(d.roadmaps, "roadmaps"),
  };
}
