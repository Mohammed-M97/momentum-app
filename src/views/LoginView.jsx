/* ===== LoginView =========================================================
   The only screen that runs while there is no token. It owns four pieces of
   state and one async handler; everything else it defers.

   Two boundaries worth keeping straight:

     - This view calls saveToken itself. It does not hand the token up to
       AuthGate. auth.js owns localStorage, AuthGate owns a boolean — which
       is why the gate never has to know what a token is.

     - onSuccess() runs AFTER saveToken. The gate flips its boolean and
       mounts App, which immediately starts fetching. The token has to be
       in localStorage by that moment, not a tick later.

   There is no <form> element on purpose: a bare submit reloads the page.
   The button's onClick is the submit path, and Enter on either input is
   wired to the same handler.

   The .momentum wrapper is what makes this look like the rest of the app:
   every theme variable in momentum.css is defined on .momentum[data-theme],
   so without it the shared .onboard/.btn/.inp rules resolve to nothing.
   profile.theme is not loaded yet at this point, so the OS preference
   stands in for it.
   ======================================================================== */

import { useState } from "react";
import { post } from "../lib/api.js";
import { saveToken } from "../lib/auth.js";
import { Field } from "../components/ui.jsx";

export default function LoginView({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [systemDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  /* BACKEND HOOK: POST /auth/login -> { token }
     err.message is already the server's own string: request() pulls it from
     payload.message, so a bad password surfaces "Invalid credentials" and a
     stopped backend surfaces the network message. Nothing to map here. */
  const submit = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await post("/auth/login", { email, password });
      saveToken(result.token);
      onSuccess();
    } catch (err) {
      setError(err && err.message ? err.message : "Could not sign you in");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="momentum" data-theme={systemDark ? "dark" : "light"}>
      <div className="onboard">
        <div className="onboard-card">
          <div className="logo lg" aria-hidden="true">M</div>
          <h1 className="onboard-title">Welcome back</h1>
          <p className="onboard-sub">Sign in to pick your momentum back up.</p>

          <Field label="Email" htmlFor="login-email">
            <input id="login-email" className="inp full" type="email"
              autoComplete="username" placeholder="you@example.com"
              value={email} disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown} />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <input id="login-password" className="inp full" type="password"
              autoComplete="current-password" placeholder="Your password"
              value={password} disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown} />
          </Field>

          {error && (
            <p className="panel-error" role="alert">{error}</p>
          )}

          <div className="onboard-actions">
            <button className="btn primary" onClick={submit} disabled={loading}>
              {loading ? "Signing in" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
