/* ===== launch intent =====================================================
   The installed app's long-press shortcuts open URLs like
     /?tab=tasks&new=1&source=shortcut
   This reads those params ONCE at startup, then strips them from the
   address bar so a reload does not repeat the action. App asks for the
   intent when it mounts (which can be after login, so it is kept here).
   ======================================================================== */

const TABS = ["today", "tasks", "goals", "weekly", "roadmap", "settings"];

let intent = { tab: null, newTask: false };

export function captureLaunchIntent() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  intent = {
    tab: TABS.includes(tab) ? tab : null,
    newTask: params.get("new") === "1",
  };
  ["tab", "new", "source"].forEach((k) => params.delete(k));
  const query = params.toString();
  window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
}

/* Returns the intent and clears it, so it only applies to the first App mount. */
export function consumeLaunchIntent() {
  const i = intent;
  intent = { tab: null, newTask: false };
  return i;
}
