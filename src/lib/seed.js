/* ===== 5. seed ===========================================================
   Optional example data. Loaded only when a new user picks "Load example
   data" during onboarding. Nothing here is invented history; the weekly
   chart still only ever reflects work actually done.
   ======================================================================== */

import { newEntity, uid } from "./entities.js";
import { shiftDate, todayStr } from "./dates.js";

export function starterData(categories) {
  const catId = (name) => {
    const c = categories.find((x) => x.name === name);
    return c ? c.id : null;
  };
  const goals = [
    newEntity({ title: "Get a tech job", categoryId: catId("Work"),
      why: "I have a web development background and I want to restart my career.",
      targetDate: shiftDate(todayStr(), 180), status: "active" }),
    newEntity({ title: "Complete React learning", categoryId: catId("Learning"),
      why: "Foundation for my portfolio and job applications.",
      targetDate: shiftDate(todayStr(), 30), status: "active" }),
    newEntity({ title: "Start going to the gym", categoryId: catId("Health"),
      why: "Build a habit I can keep.", targetDate: null, status: "active" }),
  ];
  const react = goals[1].id, gym = goals[2].id, t = todayStr();
  const tasks = [
    newEntity({ title: "Watch one React lesson (useEffect)", date: t, done: false, effort: "low", goalId: react }),
    newEntity({ title: "Do one coding exercise from the lesson", date: t, done: false, effort: "mid", goalId: react }),
    newEntity({ title: "Look up gyms nearby and compare prices", date: t, done: false, effort: "low", goalId: gym }),
    newEntity({ title: "Read one article about portfolio projects", date: null, done: false, effort: "low", goalId: react }),
  ];
  const roadmaps = [
    newEntity({ title: "Road to a tech job", phases: [
      { id: uid(), title: "React", items: [
        { id: uid(), text: "useState and basic hooks", done: true },
        { id: uid(), text: "useEffect", done: false },
        { id: uid(), text: "React Router", done: false },
        { id: uid(), text: "Build one small React project", done: false },
      ]},
      { id: uid(), title: "Node.js and backend", items: [
        { id: uid(), text: "Node.js basics", done: false },
        { id: uid(), text: "Express and REST APIs", done: false },
        { id: uid(), text: "MongoDB essentials", done: false },
        { id: uid(), text: "Connect frontend to backend", done: false },
      ]},
      { id: uid(), title: "Portfolio", items: [
        { id: uid(), text: "Build one full stack project", done: false },
        { id: uid(), text: "Deploy it online", done: false },
        { id: uid(), text: "Write a clear README", done: false },
      ]},
      { id: uid(), title: "Job search", items: [
        { id: uid(), text: "Update CV with projects", done: false },
        { id: uid(), text: "Apply to three jobs per week", done: false },
        { id: uid(), text: "Practice interview questions", done: false },
      ]},
    ]}),
  ];
  return { goals, tasks, roadmaps };
}

export const emptyRoadmaps = () => [newEntity({ title: "My roadmap", phases: [] })];
