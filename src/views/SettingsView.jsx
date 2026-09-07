/* ===== 13. SettingsView ==================================================
   Profile, appearance, week start, backup, and the destructive erase.
   Onboarding lives here too since it is the "first run" counterpart.

   Note this view still never touches storage: it reads `profile` and calls
   callbacks. The import flow only PARSES the picked file and hands the
   result up to App, which decides whether to apply it.
   ======================================================================== */

import { useState, useRef } from "react";
import { touch } from "../lib/entities.js";
import { Segmented, Field } from "../components/ui.jsx";
import { readFileAsText, parseImport } from "../lib/transfer.js";

/* The three real-world week conventions. The values are JS day numbers,
   matching what Date.getDay() returns and what weekStartOf() expects. */
const WEEK_STARTS = [
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
];

export function SettingsView({ profile, setProfile, backendLabel, saveStatus, onReset, onExport, onImport, onLogout }) {
  const fileRef = useRef(null);
  const [importError, setImportError] = useState("");

  const pickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    /* Clear the input so picking the SAME file again still fires onChange. */
    e.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const text = await readFileAsText(file);
      onImport(parseImport(text));
    } catch (err) {
      setImportError(err && err.message ? err.message : "Could not read that backup.");
    }
  };

  return (
    <div className="view">
      <div className="rule"><h2>Settings</h2></div>

      <section className="panel">
        <h3 className="panel-title">Profile</h3>
        <Field label="Your name" hint="used in the greeting on Today" htmlFor="s-name">
          <input id="s-name" className="inp full" value={profile.name} placeholder="Your name"
            onChange={(e) => setProfile(touch(profile, { name: e.target.value }))} />
        </Field>
        <p className="panel-note">Leave it empty for a plain greeting with no name.</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">Appearance</h3>
        <Segmented label="Theme" value={profile.theme} onChange={(v) => setProfile(touch(profile, { theme: v }))}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "Match system" },
          ]} />
        <p className="panel-note">Match system follows your device setting until you choose light or dark yourself.</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">Week</h3>
        <Segmented label="Week starts on" value={profile.weekStart}
          onChange={(v) => setProfile(touch(profile, { weekStart: v }))}
          options={WEEK_STARTS} />
        <p className="panel-note">Your weekly percentage and the chart group tasks from this day onward. Changing it regroups your history immediately; no data is altered.</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">Backup</h3>
        <p className="panel-note">Everything lives in this browser, so a cleared cache means a fresh start. Export gives you one JSON file with all of it.</p>
        <div className="panel-actions">
          <button className="btn" onClick={onExport}>Export backup</button>
          <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json"
            style={{ display: "none" }} onChange={pickFile} />
        </div>
        {importError && <p className="panel-error">{importError}</p>}
        <p className="panel-note">Importing replaces everything currently here, so export first if you are unsure.</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">Storage</h3>
        <p className="panel-note">{backendLabel}.</p>
        {saveStatus.state === "error" && (
          <p className="panel-error">Last save failed: {saveStatus.message}.</p>
        )}
        <div className="panel-actions">
          <button className="btn danger" onClick={onReset}>Erase everything</button>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Sign out</h3>
        <p className="panel-note">You can sign back in at any time.</p>
        <div className="panel-actions">
          <button className="btn" onClick={onLogout}>Sign out</button>
        </div>
      </section>
    </div>
  );
}

export function Onboarding({ onChoose }) {
  const [name, setName] = useState("");
  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="logo lg" aria-hidden="true">M</div>
        <h1 className="onboard-title">Momentum</h1>
        <p className="onboard-sub">Goals you can see, tasks small enough to finish, and a weekly number that moves on its own.</p>
        <Field label="What should I call you?" hint="optional" htmlFor="ob-name">
          <input id="ob-name" className="inp full" value={name} placeholder="Your name"
            onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="onboard-actions">
          <button className="btn primary" onClick={() => onChoose("empty", name.trim())}>Start empty</button>
          <button className="btn" onClick={() => onChoose("demo", name.trim())}>Load example data</button>
        </div>
        <p className="onboard-note">Example data adds a sample roadmap and goals so you can see how the parts fit. Erase it any time in Settings. No invented history; the weekly chart only ever shows work you actually did.</p>
      </div>
    </div>
  );
}
