/* ===== 1. config =========================================================
   Constants, store keys, and the starting category list a new user gets.
   ======================================================================== */

import { newEntity } from "./entities.js";

export const STORE_KEYS = {
  goals: "momentum_goals",
  tasks: "momentum_tasks",
  roadmaps: "momentum_roadmaps",
  profile: "momentum_profile",
  categories: "momentum_categories",
};

export const EFFORT = {
  low:  { label: "15 min", color: "#2f9e63" },
  mid:  { label: "30 min", color: "#c79016" },
  high: { label: "1 hour", color: "#cc5b3f" },
};
export const EFFORT_KEYS = Object.keys(EFFORT);

export const GOAL_STATUS = { active: "Active", paused: "Paused", done: "Done" };

export const DEFAULT_PROFILE = {
  name: "",
  theme: "system",      // system | light | dark
  weekStart: 6,         // Saturday; week math uses it, no UI needed for now
  onboarded: false,
};

/* Decision 2: categories are data. This is only the STARTING list a new
   user gets; after that the user owns it. On the backend this becomes a
   `categories` collection per user. */
export function defaultCategories() {
  return [
    newEntity({ name: "Work",     color: "#3b6fd8" }),
    newEntity({ name: "Learning", color: "#8a5cd8" }),
    newEntity({ name: "Health",   color: "#2f9e63" }),
    newEntity({ name: "Personal", color: "#d88a3b" }),
  ];
}
