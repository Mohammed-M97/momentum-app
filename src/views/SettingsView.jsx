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
import { useI18n } from "../lib/i18n.js";
import { useInstall } from "../lib/install.js";

/* The three real-world week conventions. The values are JS day numbers,
   matching what Date.getDay() returns and what weekStartOf() expects. */
const WEEK_STARTS = [
  { value: 6, key: "set.sat" },
  { value: 0, key: "set.sun" },
  { value: 1, key: "set.mon" },
];

export function SettingsView({ profile, setProfile, lang, setLang, backendLabel, saveStatus, onReset, onExport, onImport, onLogout, isDemo }) {
  const { t } = useI18n();
  const install = useInstall();
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
      <div className="rule"><h2>{t("set.title")}</h2></div>

      <section className="panel">
        <h3 className="panel-title">{t("set.language")}</h3>
        <Segmented label={t("set.language")} value={lang} onChange={setLang}
          options={[
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ]} />
        <p className="panel-note">{t("set.languageNote")}</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.install")}</h3>
        {install.installed ? (
          <p className="panel-note">{t("set.installed")}</p>
        ) : (
          <>
            <p className="panel-note">{t("set.installNote")}</p>
            {install.canPrompt ? (
              <div className="panel-actions">
                <button className="btn primary" onClick={install.prompt}>{t("set.installBtn")}</button>
              </div>
            ) : (
              <p className="panel-note">{t("set.installManual")}</p>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.profile")}</h3>
        <Field label={t("set.name")} hint={t("set.nameHint")} htmlFor="s-name">
          <input id="s-name" className="inp full" value={profile.name} placeholder={t("set.namePh")}
            onChange={(e) => setProfile(touch(profile, { name: e.target.value }))} />
        </Field>
        <p className="panel-note">{t("set.nameNote")}</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.appearance")}</h3>
        <Segmented label={t("set.theme")} value={profile.theme} onChange={(v) => setProfile(touch(profile, { theme: v }))}
          options={[
            { value: "light", label: t("set.light") },
            { value: "dark", label: t("set.dark") },
            { value: "system", label: t("set.system") },
          ]} />
        <p className="panel-note">{t("set.themeNote")}</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.week")}</h3>
        <Segmented label={t("set.weekStarts")} value={profile.weekStart}
          onChange={(v) => setProfile(touch(profile, { weekStart: v }))}
          options={WEEK_STARTS.map((w) => ({ value: w.value, label: t(w.key) }))} />
        <p className="panel-note">{t("set.weekNote")}</p>
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.backup")}</h3>
        <p className="panel-note">{t("set.backupNote")}</p>
        <div className="panel-actions">
          <button className="btn" onClick={onExport}>{t("set.export")}</button>
          {!isDemo && (
            <>
              <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}>{t("set.import")}</button>
              <input ref={fileRef} type="file" accept="application/json,.json"
                style={{ display: "none" }} onChange={pickFile} />
            </>
          )}
        </div>
        {importError && <p className="panel-error">{importError}</p>}
        {!isDemo && <p className="panel-note">{t("set.importNote")}</p>}
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.storage")}</h3>
        <p className="panel-note">{backendLabel}.</p>
        {saveStatus.state === "error" && (
          <p className="panel-error">{t("set.lastFailed", { msg: saveStatus.message })}</p>
        )}
        {/* Demo visitors share sample data, so the destructive actions stay hidden */}
        {!isDemo && (
          <div className="panel-actions">
            <button className="btn danger" onClick={onReset}>{t("set.erase")}</button>
          </div>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">{t("set.signOutTitle")}</h3>
        <p className="panel-note">{t("set.signOutNote")}</p>
        <div className="panel-actions">
          <button className="btn" onClick={onLogout}>{t("set.signOut")}</button>
        </div>
      </section>
    </div>
  );
}

export function Onboarding({ onChoose, isDemo }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="logo lg" aria-hidden="true">M</div>
        <h1 className="onboard-title">Momentum</h1>
        <p className="onboard-sub">{t("onb.sub")}</p>
        <Field label={t("onb.callYou")} hint={t("common.optional")} htmlFor="ob-name">
          <input id="ob-name" className="inp full" value={name} placeholder={t("set.namePh")}
            onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="onboard-actions">
          <button className="btn primary" onClick={() => onChoose("empty", name.trim())}>{t("onb.empty")}</button>
          {!isDemo && <button className="btn" onClick={() => onChoose("demo", name.trim())}>{t("onb.example")}</button>}
        </div>
        <p className="onboard-note">{t("onb.note")}</p>
      </div>
    </div>
  );
}
