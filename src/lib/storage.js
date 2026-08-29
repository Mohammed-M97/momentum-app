/* ===== 4. storage ========================================================
   BACKEND HOOK: storage adapter ------------------------------------------
   THIS IS THE MAIN SEAM WHERE YOUR BACKEND CONNECTS.

   Today: three local backends picked by feature detection (Claude storage,
   localStorage, in-memory). Each implements get(key) and set(key, value).

   When you build your API, add a fourth backend here that talks HTTP:

     const apiBackend = {
       id: "api",
       label: "Synced with your account",
       async get(key)      { GET  /api/<collection>  },
       async set(key, val) { ...see note below...    },
     };

   IMPORTANT: do not literally implement set() as "upload the whole array"
   against a real API. That works locally but is wasteful over a network.
   The right move is to replace the five useAutoSave calls in App with
   per-record calls (POST /tasks, PATCH /tasks/:id, ...) fired from the
   mutation helpers, and keep this local backend as an offline cache.
   The README explains this step by step.
   ----------------------------------------------------------------------- */

import { useEffect } from "react";

const memoryBackend = (() => {
  const map = new Map();
  return {
    id: "memory",
    label: "Storage unavailable here, data lasts this session only",
    async get(k) {
      return map.has(k) ? map.get(k) : null;
    },
    async set(k, v) {
      map.set(k, v);
    },
  };
})();

function detectBackend() {
  if (typeof window !== "undefined" && window.storage) {
    return {
      id: "claude",
      label: "Saved to your Claude account",
      async get(k) {
        try {
          const r = await window.storage.get(k, false);
          return r ? r.value : null;
        } catch {
          return null;
        }
      },
      async set(k, v) {
        const r = await window.storage.set(k, v, false);
        if (!r) throw new Error("Storage rejected the write");
      },
    };
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("__probe__", "1");
      localStorage.removeItem("__probe__");
      return {
        id: "local",
        label: "Saved in this browser",
        async get(k) {
          return localStorage.getItem(k);
        },
        async set(k, v) {
          localStorage.setItem(k, v);
        },
      };
    }
  } catch {
    /* fall through */
  }
  return memoryBackend;
}

export const store = detectBackend();

/* export async function loadJSON(key, fallback) {
  try {
    const raw = await store.get(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch { return fallback; }
} */

export async function loadJSON(key, fallback) {
  const raw = await store.get(key); // ما فيه catch — الأخطاء تطلع للأعلى
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch {
    throw new Error('Saved data for "' + key + '" is corrupted');
  }
}

export async function saveJSON(key, value) {
  await store.set(key, JSON.stringify(value));
}

/* HARD CONCEPT: debounced autosave ---------------------------------------
   Typing in a textarea would otherwise fire a save on every keystroke.
   We wait 350ms of silence before writing. The cleanup function cancels
   the pending save if the value changes again first. When you move to an
   API, the same debounce idea protects your server from request storms.
   ----------------------------------------------------------------------- */
export function useAutoSave(key, value, hydrated, report) {
  useEffect(() => {
    if (!hydrated) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      report({ state: "saving" });
      saveJSON(key, value)
        .then(() => {
          if (!cancelled) report({ state: "saved" });
        })
        .catch((err) => {
          if (!cancelled)
            report({
              state: "error",
              message: err && err.message ? err.message : "Could not save",
            });
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, value, hydrated, report]);
}
