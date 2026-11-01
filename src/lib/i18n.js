/* ===== i18n ==============================================================
   Two languages: English and Arabic. The choice lives in localStorage
   under "momentum_lang" (not in the profile) because the login screen
   needs it before any profile is loaded.

   Usage in a component:
     const { t, lang } = useI18n();
     t("nav.today")                      -> "Today" | "اليوم"
     t("tasks.tooMany", { n: 7 })        -> functions get the vars object
     t("common.removed", { title })      -> strings get {title} replaced

   Dates always use the Gregorian calendar and Latin digits in Arabic
   ("ar-u-ca-gregory-nu-latn"), so numbers read the same in both languages.
   ======================================================================== */

import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

const LANG_KEY = "momentum_lang";
export const LANGS = ["ar", "en"];

export function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* ignore */ }
  const nav = (typeof navigator !== "undefined" && navigator.language) || "";
  return nav.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export const localeFor = (lang) => (lang === "ar" ? "ar-u-ca-gregory-nu-latn" : "en");

/* Module-level locale so plain helpers (lib/dates.js) can format dates
   without needing React context. Kept in sync by the provider. */
let currentLang = typeof window !== "undefined" ? detectLang() : "en";
export const getLocale = () => localeFor(currentLang);

function applyToDocument(lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

/* Arabic count words: 1, 2, 3-10, 11+ take different forms. */
const ar = (n, one, two, few, many) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? n + " " + few : n + " " + many;
const en = (n, word) => n + " " + word + (n === 1 ? "" : "s");

const dict = {
  en: {
    "nav.today": "Today", "nav.tasks": "Tasks", "nav.goals": "Goals",
    "nav.weekly": "Weekly", "nav.roadmap": "Roadmap", "nav.settings": "Settings",
    "nav.sections": "Sections",

    "common.cancel": "Cancel", "common.delete": "Delete", "common.save": "Save changes",
    "common.add": "Add", "common.done": "Done", "common.optional": "optional",
    "common.close": "Close dialog", "common.none": "None", "common.noGoal": "No goal",
    "common.markDone": "Mark done: ", "common.markNotDone": "Mark not done: ",
    "common.removed": '"{title}" will be removed.',

    "save.saving": "Saving", "save.saved": "Saved", "save.error": "Not saved",
    "theme.toLight": "Switch to light theme", "theme.toDark": "Switch to dark theme",

    "load.errorTitle": "Could not load your data",
    "load.safe": "Nothing has been saved over. Your data is still there.",
    "load.retry": "Try again", "load.loading": "Loading your data",

    "effort.low": "15 min", "effort.mid": "30 min", "effort.high": "1 hour",
    "status.active": "Active", "status.paused": "Paused", "status.done": "Done", "status.all": "All",

    "date.today": "Today", "date.tomorrow": "Tomorrow", "date.yesterday": "Yesterday",

    "confirm.taskTitle": "Delete this task?",
    "confirm.goalTitle": "Delete this goal?",
    "confirm.goalLinked": ({ title, n }) => '"' + title + '" has ' + en(n, "linked task") + ". By default those tasks stay and lose the link.",
    "confirm.goalAlso": ({ n }) => "Delete the " + en(n, "linked task") + " as well",
    "confirm.roadmapTitle": "Delete this roadmap?",
    "confirm.roadmapMsg": '"{title}" and all of its phases and steps will be removed.',
    "confirm.phaseTitle": "Delete this phase?",
    "confirm.phaseMsg": ({ title, n }) => '"' + title + '" and its ' + en(n, "step") + " will be removed.",
    "confirm.importTitle": "Replace everything with this backup?",
    "confirm.importBtn": "Import and replace",
    "confirm.importMsg": ({ g, t, r }) => "This backup holds " + en(g, "goal") + ", " + en(t, "task") + " and " + en(r, "roadmap") + ". Everything currently in Momentum will be replaced by it.",
    "confirm.resetTitle": "Erase everything?", "confirm.resetBtn": "Erase everything",
    "confirm.resetMsg": "All goals, tasks, roadmaps and categories will be deleted permanently.",

    "today.morning": "Good morning", "today.afternoon": "Good afternoon", "today.evening": "Good evening",
    "today.greetName": "{part}, {name}",
    "today.msgEmpty": "No tasks scheduled for today. Plan one in the Tasks tab; small enough that starting feels easy.",
    "today.msgAllDone": "All clear. A finished day beats a perfect plan.",
    "today.msgNone": "Pick the smallest item and start it. Momentum follows action.",
    "today.msgStarted": "You have started. Keep the chain going.",
    "today.summary": "Progress summary", "today.doneToday": " done today",
    "today.vsLastWeek": "vs last week",
    "today.hint": "tick things off here, plan in Tasks", "today.plan": "Plan tasks",
    "today.emptyTitle": "Nothing scheduled", "today.emptyBody": "Open the Tasks tab to schedule work for today.",
    "today.goTasks": "Go to Tasks",

    "tasks.hint": "plan the work, then live in Today",
    "tasks.chooseDay": "Choose which day to plan", "tasks.pickDay": "Pick a day", "tasks.backlog": "Backlog",
    "tasks.prevDay": "Previous day", "tasks.nextDay": "Next day", "tasks.date": "Task date",
    "tasks.addTo": "Add a task to {heading}", "tasks.newTitle": "New task title",
    "tasks.effort": "Effort estimate", "tasks.linkGoal": "Link to a goal",
    "tasks.backlogHint": "unscheduled ideas, schedule them when you have room",
    "tasks.dayHint": "five or fewer keeps it doable",
    "tasks.backlogEmpty": "Backlog is empty", "tasks.noneFor": "No tasks for {heading}",
    "tasks.emptyBody": "Add one above. Small and specific beats big and vague.",
    "tasks.edit": "Edit task: ", "tasks.delete": "Delete task: ",
    "tasks.tooMany": ({ n }) => n + " tasks on one day. Move the least urgent to tomorrow or the backlog.",
    "tasks.editTitle": "Edit task", "tasks.task": "Task", "tasks.effortLabel": "Effort",
    "tasks.goal": "Goal", "tasks.when": "When", "tasks.schedule": "Schedule", "tasks.onDay": "On a day",

    "goals.overdue": ({ n }) => n + "w overdue", "goals.thisWeek": "this week",
    "goals.left": ({ n }) => n + "w left",
    "goals.edit": "Edit goal: ", "goals.delete": "Delete goal: ",
    "goals.noLinked": "no linked tasks yet",
    "goals.progress": ({ pct, done, total }) => pct + "% (" + done + " of " + total + " tasks)",
    "goals.statusFor": "Status for ",
    "goals.hint": "Progress is measured by linked tasks. Add tasks in the Tasks tab and link them to this goal.",
    "goals.active": ({ n }) => n + " active",
    "goals.categories": "Categories", "goals.new": "New goal", "goals.filter": "Filter goals by status",
    "goals.noActive": "No active goals", "goals.nothing": "Nothing here",
    "goals.emptyBody": "A goal is the reason a small task is worth doing.",
    "goals.editTitle": "Edit goal", "goals.addGoal": "Add goal", "goals.goal": "Goal",
    "goals.goalPh": "Learn Express and REST APIs", "goals.category": "Category",
    "goals.target": "Target date", "goals.why": "Why this matters",
    "goals.whyHint": "read it when motivation drops", "goals.whyPh": "The real reason you set this goal.",
    "goals.status": "Status",
    "cats.intro": "Categories are yours to shape. Goals keep working if you delete their category; they just lose the label.",
    "cats.colorFor": "Color for ", "cats.name": "Category name", "cats.delete": "Delete category: ",
    "cats.newColor": "New category color", "cats.newPh": "New category", "cats.newName": "New category name",

    "weekly.title": "Weekly momentum", "weekly.hint": "calculated from your tasks, nothing to fill in",
    "weekly.thisWeek": "This week", "weekly.ofDone": ({ done, total }) => done + " of " + total + " done",
    "weekly.finished": "Tasks finished", "weekly.lastWeekN": ({ n }) => n + " last week",
    "weekly.lastWeek": "Last week", "weekly.baseline": "your baseline", "weekly.noData": "no data yet",
    "weekly.chart": "Weekly completion chart",
    "weekly.lastN": ({ n }) => "Last " + en(n, "week"),
    "weekly.barAria": ({ week, pct, done, total }) => "Week of " + week + ": " + pct + " percent, " + done + " of " + total + " tasks",
    "weekly.foot": "Each bar is the share of that week's tasks you finished. The filled bar is this week.",
    "weekly.noHistory": "No history yet",
    "weekly.noHistoryBody": "Finish a few tasks and this chart fills itself in. One week of real data beats any starting number.",

    "road.untitled": "Untitled roadmap", "road.none": "No roadmaps",
    "road.noneBody": "A roadmap is the long path, broken into phases you can tick off.",
    "road.new": "New roadmap", "road.title": "Roadmaps",
    "road.stepsDone": ({ done, total }) => done + " of " + total + " steps done",
    "road.select": "Select a roadmap", "road.name": "Roadmap name",
    "road.rename": "Rename roadmap", "road.delete": "Delete roadmap",
    "road.noPhases": "No phases yet",
    "road.noPhasesBody": "Break the goal into stages. Each stage holds the steps you tick off.",
    "road.phaseName": "Phase name", "road.phaseUp": "Move phase up: ", "road.phaseDown": "Move phase down: ",
    "road.phaseRename": "Rename phase: ", "road.phaseDelete": "Delete phase: ",
    "road.stepText": "Step text", "road.stepUp": "Move step up", "road.stepDown": "Move step down",
    "road.stepRename": "Rename step: ", "road.stepDelete": "Delete step: ",
    "road.addStepPh": "Add a step", "road.newStepIn": "New step in ", "road.addStep": "Add step",
    "road.addPhasePh": "Add a phase", "road.newPhase": "New phase name", "road.addPhase": "Add phase",

    "set.title": "Settings", "set.profile": "Profile", "set.name": "Your name",
    "set.nameHint": "used in the greeting on Today", "set.namePh": "Your name",
    "set.nameNote": "Leave it empty for a plain greeting with no name.",
    "set.appearance": "Appearance", "set.theme": "Theme", "set.light": "Light", "set.dark": "Dark",
    "set.system": "Match system",
    "set.themeNote": "Match system follows your device setting until you choose light or dark yourself.",
    "set.language": "Language", "set.languageNote": "Changes the interface only. Your goals and tasks stay as you wrote them.",
    "set.week": "Week", "set.weekStarts": "Week starts on",
    "set.sat": "Saturday", "set.sun": "Sunday", "set.mon": "Monday",
    "set.weekNote": "Your weekly percentage and the chart group tasks from this day onward. Changing it regroups your history immediately; no data is altered.",
    "set.install": "App", "set.installBtn": "Install Momentum",
    "set.installNote": "Install it to get its own icon and window, so it opens straight away instead of hiding between browser tabs.",
    "set.installManual": "To install: open the browser menu and choose Install app or Add to Home screen.",
    "set.installed": "Momentum is installed and running as an app.",
    "set.backup": "Backup",
    "set.backupNote": "Everything lives in this browser, so a cleared cache means a fresh start. Export gives you one JSON file with all of it.",
    "set.export": "Export backup", "set.import": "Import backup",
    "set.importNote": "Importing replaces everything currently here, so export first if you are unsure.",
    "set.storage": "Storage", "set.lastFailed": "Last save failed: {msg}.",
    "set.erase": "Erase everything", "set.signOutTitle": "Sign out",
    "set.signOutNote": "You can sign back in at any time.", "set.signOut": "Sign out",
    "storage.local": "Saved in this browser", "storage.claude": "Saved to your Claude account",
    "storage.memory": "Storage unavailable here, data lasts this session only",

    "onb.sub": "Goals you can see, tasks small enough to finish, and a weekly number that moves on its own.",
    "onb.callYou": "What should I call you?", "onb.empty": "Start empty", "onb.example": "Load example data",
    "onb.note": "Example data adds a sample roadmap and goals so you can see how the parts fit. Erase it any time in Settings. No invented history; the weekly chart only ever shows work you actually did.",

    "login.title": "Welcome back", "login.sub": "Sign in to pick your momentum back up.",
    "login.email": "Email", "login.password": "Password", "login.passwordPh": "Your password",
    "login.signingIn": "Signing in", "login.signIn": "Sign in", "login.failed": "Could not sign you in",
  },

  ar: {
    "nav.today": "اليوم", "nav.tasks": "المهام", "nav.goals": "الأهداف",
    "nav.weekly": "الأسبوع", "nav.roadmap": "الخطة", "nav.settings": "الإعدادات",
    "nav.sections": "الأقسام",

    "common.cancel": "إلغاء", "common.delete": "حذف", "common.save": "حفظ التعديلات",
    "common.add": "إضافة", "common.done": "تم", "common.optional": "اختياري",
    "common.close": "إغلاق", "common.none": "بدون", "common.noGoal": "بدون هدف",
    "common.markDone": "تحديد كمنجزة: ", "common.markNotDone": "إلغاء الإنجاز: ",
    "common.removed": "راح ينحذف «{title}».",

    "save.saving": "جاري الحفظ", "save.saved": "انحفظ", "save.error": "ما انحفظ",
    "theme.toLight": "الوضع الفاتح", "theme.toDark": "الوضع الداكن",

    "load.errorTitle": "تعذّر تحميل بياناتك",
    "load.safe": "ما تغيّر شي، بياناتك موجودة زي ما هي.",
    "load.retry": "حاول مرة ثانية", "load.loading": "جاري تحميل بياناتك",

    "effort.low": "15 دقيقة", "effort.mid": "30 دقيقة", "effort.high": "ساعة",
    "status.active": "نشط", "status.paused": "متوقف", "status.done": "منجز", "status.all": "الكل",

    "date.today": "اليوم", "date.tomorrow": "بكرة", "date.yesterday": "أمس",

    "confirm.taskTitle": "تحذف هالمهمة؟",
    "confirm.goalTitle": "تحذف هالهدف؟",
    "confirm.goalLinked": ({ title, n }) => "الهدف «" + title + "» مرتبط فيه " + ar(n, "مهمة وحدة", "مهمتين", "مهام", "مهمة") + ". المهام تبقى وينفك ارتباطها بس.",
    "confirm.goalAlso": ({ n }) => "احذف " + ar(n, "المهمة المرتبطة", "المهمتين المرتبطتين", "مهام مرتبطة", "مهمة مرتبطة") + " بعد",
    "confirm.roadmapTitle": "تحذف هالخطة؟",
    "confirm.roadmapMsg": "راح تنحذف «{title}» بكل مراحلها وخطواتها.",
    "confirm.phaseTitle": "تحذف هالمرحلة؟",
    "confirm.phaseMsg": ({ title, n }) => "راح تنحذف «" + title + "» ومعها " + ar(n, "خطوة وحدة", "خطوتين", "خطوات", "خطوة") + ".",
    "confirm.importTitle": "تستبدل كل شي بهالنسخة؟",
    "confirm.importBtn": "استيراد واستبدال",
    "confirm.importMsg": ({ g, t, r }) => "النسخة فيها " + g + " أهداف و" + t + " مهام و" + r + " خطط. كل اللي في Momentum الحين راح يتبدل فيها.",
    "confirm.resetTitle": "تمسح كل شي؟", "confirm.resetBtn": "امسح كل شي",
    "confirm.resetMsg": "راح تنحذف كل الأهداف والمهام والخطط والتصنيفات نهائياً.",

    "today.morning": "صباح الخير", "today.afternoon": "مساء الخير", "today.evening": "مساء النور",
    "today.greetName": "{part} يا {name}",
    "today.msgEmpty": "ما عندك مهام اليوم. خطّط وحدة من صفحة المهام، وخلها صغيرة لدرجة إن البداية تكون سهلة.",
    "today.msgAllDone": "خلصت كل شي. يوم منجز أحسن من خطة مثالية.",
    "today.msgNone": "اختر أصغر مهمة وابدأ فيها. الحماس يجي بعد الحركة.",
    "today.msgStarted": "بديت، كمّل السلسلة.",
    "today.summary": "ملخص التقدم", "today.doneToday": " أنجزتها اليوم",
    "today.vsLastWeek": "عن الأسبوع الماضي",
    "today.hint": "هنا تنجز، والتخطيط في المهام", "today.plan": "خطّط مهامك",
    "today.emptyTitle": "ما فيه شي مجدول", "today.emptyBody": "افتح صفحة المهام وحط شغل اليوم.",
    "today.goTasks": "روح للمهام",

    "tasks.hint": "خطّط هنا، وأنجز في صفحة اليوم",
    "tasks.chooseDay": "اختر اليوم اللي تخطط له", "tasks.pickDay": "يوم معيّن", "tasks.backlog": "لاحقاً",
    "tasks.prevDay": "اليوم السابق", "tasks.nextDay": "اليوم التالي", "tasks.date": "تاريخ المهمة",
    "tasks.addTo": "أضف مهمة إلى {heading}", "tasks.newTitle": "عنوان المهمة الجديدة",
    "tasks.effort": "الوقت المتوقع", "tasks.linkGoal": "اربطها بهدف",
    "tasks.backlogHint": "أفكار بدون موعد، جدولها لما يكون عندك وقت",
    "tasks.dayHint": "خمس مهام أو أقل تخلي اليوم ممكن",
    "tasks.backlogEmpty": "قائمة لاحقاً فاضية", "tasks.noneFor": "ما فيه مهام في {heading}",
    "tasks.emptyBody": "أضف وحدة من فوق. مهمة صغيرة وواضحة أحسن من كبيرة ومبهمة.",
    "tasks.edit": "تعديل المهمة: ", "tasks.delete": "حذف المهمة: ",
    "tasks.tooMany": ({ n }) => n + " مهام في يوم واحد كثير. انقل الأقل أهمية لبكرة أو لقائمة لاحقاً.",
    "tasks.editTitle": "تعديل المهمة", "tasks.task": "المهمة", "tasks.effortLabel": "الوقت",
    "tasks.goal": "الهدف", "tasks.when": "متى", "tasks.schedule": "الموعد", "tasks.onDay": "في يوم معيّن",

    "goals.overdue": ({ n }) => "متأخر " + ar(n, "أسبوع", "أسبوعين", "أسابيع", "أسبوع"),
    "goals.thisWeek": "هالأسبوع",
    "goals.left": ({ n }) => "باقي " + ar(n, "أسبوع", "أسبوعين", "أسابيع", "أسبوع"),
    "goals.edit": "تعديل الهدف: ", "goals.delete": "حذف الهدف: ",
    "goals.noLinked": "ما فيه مهام مرتبطة",
    "goals.progress": ({ pct, done, total }) => pct + "% (" + done + " من " + total + ")",
    "goals.statusFor": "حالة ",
    "goals.hint": "التقدم يُحسب من المهام المرتبطة. أضف مهام من صفحة المهام واربطها بهالهدف.",
    "goals.active": ({ n }) => n + " نشط",
    "goals.categories": "التصنيفات", "goals.new": "هدف جديد", "goals.filter": "فلترة الأهداف حسب الحالة",
    "goals.noActive": "ما فيه أهداف نشطة", "goals.nothing": "ما فيه شي هنا",
    "goals.emptyBody": "الهدف هو السبب اللي يخلي المهمة الصغيرة تستاهل.",
    "goals.editTitle": "تعديل الهدف", "goals.addGoal": "أضف الهدف", "goals.goal": "الهدف",
    "goals.goalPh": "أتعلم Express وبناء API", "goals.category": "التصنيف",
    "goals.target": "التاريخ المستهدف", "goals.why": "ليش هالهدف مهم",
    "goals.whyHint": "ارجع له لما يخف حماسك", "goals.whyPh": "السبب الحقيقي اللي خلاك تحط هالهدف.",
    "goals.status": "الحالة",
    "cats.intro": "التصنيفات لك تشكّلها زي ما تبي. لو حذفت تصنيف، الأهداف تبقى بس بدون تصنيف.",
    "cats.colorFor": "لون ", "cats.name": "اسم التصنيف", "cats.delete": "حذف التصنيف: ",
    "cats.newColor": "لون التصنيف الجديد", "cats.newPh": "تصنيف جديد", "cats.newName": "اسم التصنيف الجديد",

    "weekly.title": "إنجاز الأسبوع", "weekly.hint": "محسوب من مهامك تلقائياً",
    "weekly.thisWeek": "هالأسبوع", "weekly.ofDone": ({ done, total }) => done + " من " + total + " منجزة",
    "weekly.finished": "مهام منجزة", "weekly.lastWeekN": ({ n }) => n + " الأسبوع الماضي",
    "weekly.lastWeek": "الأسبوع الماضي", "weekly.baseline": "نقطة المقارنة", "weekly.noData": "ما فيه بيانات",
    "weekly.chart": "رسم الإنجاز الأسبوعي",
    "weekly.lastN": ({ n }) => "آخر " + ar(n, "أسبوع", "أسبوعين", "أسابيع", "أسبوع"),
    "weekly.barAria": ({ week, pct, done, total }) => "أسبوع " + week + ": " + pct + "٪، " + done + " من " + total + " مهام",
    "weekly.foot": "كل عمود هو نسبة المهام اللي أنجزتها في ذاك الأسبوع. العمود الملوّن هو هالأسبوع.",
    "weekly.noHistory": "ما فيه سجل للحين",
    "weekly.noHistoryBody": "أنجز كم مهمة والرسم يتعبى لحاله. أسبوع واحد حقيقي أحسن من أي رقم مفترض.",

    "road.untitled": "خطة بدون اسم", "road.none": "ما فيه خطط",
    "road.noneBody": "الخطة هي الطريق الطويل، مقسّم لمراحل تقدر تشطب عليها.",
    "road.new": "خطة جديدة", "road.title": "الخطط",
    "road.stepsDone": ({ done, total }) => done + " من " + total + " خطوات منجزة",
    "road.select": "اختر خطة", "road.name": "اسم الخطة",
    "road.rename": "إعادة تسمية الخطة", "road.delete": "حذف الخطة",
    "road.noPhases": "ما فيه مراحل للحين",
    "road.noPhasesBody": "قسّم الهدف لمراحل، وكل مرحلة فيها خطوات تشطب عليها.",
    "road.phaseName": "اسم المرحلة", "road.phaseUp": "حرّك المرحلة لفوق: ", "road.phaseDown": "حرّك المرحلة لتحت: ",
    "road.phaseRename": "إعادة تسمية المرحلة: ", "road.phaseDelete": "حذف المرحلة: ",
    "road.stepText": "نص الخطوة", "road.stepUp": "حرّك الخطوة لفوق", "road.stepDown": "حرّك الخطوة لتحت",
    "road.stepRename": "تعديل الخطوة: ", "road.stepDelete": "حذف الخطوة: ",
    "road.addStepPh": "أضف خطوة", "road.newStepIn": "خطوة جديدة في ", "road.addStep": "أضف خطوة",
    "road.addPhasePh": "أضف مرحلة", "road.newPhase": "اسم المرحلة الجديدة", "road.addPhase": "أضف مرحلة",

    "set.title": "الإعدادات", "set.profile": "الملف الشخصي", "set.name": "اسمك",
    "set.nameHint": "يظهر في التحية بصفحة اليوم", "set.namePh": "اسمك",
    "set.nameNote": "خله فاضي لو تبي تحية بدون اسم.",
    "set.appearance": "المظهر", "set.theme": "السمة", "set.light": "فاتح", "set.dark": "داكن",
    "set.system": "حسب الجهاز",
    "set.themeNote": "خيار حسب الجهاز يتبع إعداد جوالك أو جهازك لين تختار فاتح أو داكن بنفسك.",
    "set.language": "اللغة", "set.languageNote": "تتغير الواجهة بس، وأهدافك ومهامك تبقى زي ما كتبتها.",
    "set.week": "الأسبوع", "set.weekStarts": "بداية الأسبوع",
    "set.sat": "السبت", "set.sun": "الأحد", "set.mon": "الإثنين",
    "set.weekNote": "النسبة الأسبوعية والرسم يحسبون من هاليوم. لو غيرته ينعاد التجميع فوراً بدون ما تتغير بياناتك.",
    "set.install": "التطبيق", "set.installBtn": "ثبّت Momentum كتطبيق",
    "set.installNote": "ثبّته عشان يصير له أيقونة ونافذة خاصة، ويفتح مباشرة بدل ما يضيع بين تبويبات المتصفح.",
    "set.installManual": "للتثبيت: افتح قائمة المتصفح واختر تثبيت التطبيق أو الإضافة للشاشة الرئيسية.",
    "set.installed": "Momentum مثبّت وشغال كتطبيق.",
    "set.backup": "النسخ الاحتياطي",
    "set.backupNote": "الإعدادات والخطط محفوظة في هالمتصفح، فمسح الكاش يعني بداية جديدة. التصدير يعطيك ملف JSON فيه كل شي.",
    "set.export": "تصدير نسخة", "set.import": "استيراد نسخة",
    "set.importNote": "الاستيراد يستبدل كل اللي هنا، فصدّر نسخة قبل لو مو متأكد.",
    "set.storage": "التخزين", "set.lastFailed": "فشل آخر حفظ: {msg}.",
    "set.erase": "امسح كل شي", "set.signOutTitle": "تسجيل الخروج",
    "set.signOutNote": "تقدر ترجع تسجل دخول بأي وقت.", "set.signOut": "تسجيل الخروج",
    "storage.local": "محفوظ في هالمتصفح", "storage.claude": "محفوظ في حسابك على Claude",
    "storage.memory": "التخزين غير متاح هنا، والبيانات تبقى لهالجلسة بس",

    "onb.sub": "أهداف تشوفها، ومهام صغيرة تقدر تخلصها، ورقم أسبوعي يتحرك لحاله.",
    "onb.callYou": "وش أناديك؟", "onb.empty": "ابدأ فاضي", "onb.example": "حمّل بيانات تجريبية",
    "onb.note": "البيانات التجريبية تضيف خطة وأهداف كمثال عشان تشوف كيف الأجزاء تركب على بعض. تقدر تمسحها من الإعدادات بأي وقت، والرسم الأسبوعي ما يعرض إلا شغلك الحقيقي.",

    "login.title": "هلا والله", "login.sub": "سجل دخولك وكمّل من حيث وقفت.",
    "login.email": "الإيميل", "login.password": "كلمة المرور", "login.passwordPh": "كلمة المرور",
    "login.signingIn": "جاري الدخول", "login.signIn": "دخول", "login.failed": "تعذّر تسجيل الدخول",
  },
};

function translate(lang, key, vars) {
  const v = (dict[lang] && dict[lang][key]) ?? dict.en[key];
  if (v === undefined) return key;
  if (typeof v === "function") return v(vars || {});
  if (!vars) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const I18nContext = createContext({
  lang: "en", dir: "ltr", locale: "en",
  t: (k, v) => translate("en", k, v), setLang: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const l = detectLang();
    currentLang = l;
    applyToDocument(l);
    return l;
  });
  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return;
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    currentLang = l;
    applyToDocument(l);
    setLangState(l);
  }, []);
  const value = useMemo(() => ({
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    locale: localeFor(lang),
    t: (k, v) => translate(lang, k, v),
    setLang,
  }), [lang, setLang]);
  return createElement(I18nContext.Provider, { value }, children);
}

export const useI18n = () => useContext(I18nContext);
