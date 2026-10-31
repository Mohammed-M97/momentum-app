/* ===== install ===========================================================
   Chromium browsers (Chrome, Brave, Edge) fire `beforeinstallprompt` when
   the app is installable. We keep that event so Settings can show an
   "Install" button that opens the browser's own install dialog.
   Browsers without the event (Firefox, iOS Safari) get manual steps.
   ======================================================================== */

import { useEffect, useState } from "react";

let deferred = null;
const subs = new Set();
const notify = () => subs.forEach((fn) => fn());

export function listenForInstall() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const isStandalone = () =>
  typeof window !== "undefined" &&
  ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true);

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);
  return {
    installed: isStandalone(),
    canPrompt: deferred !== null,
    prompt: async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice.catch(() => null);
      deferred = null;
      notify();
    },
  };
}
