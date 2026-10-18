import { post } from "./api";
import { saveToken, saveDemo, hasActiveDemo } from "./auth";
import { loadJSON, saveJSON } from "./storage.js";
import { STORE_KEYS, DEFAULT_PROFILE } from "./config.js";

async function markOnboarded() {
  const current = await loadJSON(STORE_KEYS.profile, null).catch(() => null);
  await saveJSON(STORE_KEYS.profile, {
    ...DEFAULT_PROFILE,
    ...(current || {}),
    name: current?.name || "Guest",
    onboarded: true,
  });
}

export async function startDemoIfRequested() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("demo")) return;

  params.delete("demo");
  const query = params.toString();
  const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
  window.history.replaceState(null, "", cleanUrl);

  if (hasActiveDemo()) return;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const data = await post("/auth/demo", { tz });
  saveToken(data.token);
  saveDemo(data.expiresAt);
  await markOnboarded();
}