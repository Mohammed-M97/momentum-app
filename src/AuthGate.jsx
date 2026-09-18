import { useState, useEffect } from "react";
import { isLoggedIn, clearToken } from "./lib/auth";
import LoginView from "./views/LoginView";
import App from "./App.jsx";
import { setUnauthorizedHandler } from "./lib/auth";

export default function AuthGate() {
  const [authed, setAuthed] = useState(() => isLoggedIn());

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthed(false));
    return () => setUnauthorizedHandler(null);
  }, []);
  return authed ? (
    <App onLogout={handleLogout} />
  ) : (
    <LoginView onSuccess={() => setAuthed(true)} />
  );
}
