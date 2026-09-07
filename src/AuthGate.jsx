import { useState } from "react";
import { isLoggedIn, clearToken } from "./lib/auth";
import LoginView from "./views/LoginView";
import App from "./App.jsx";



export default function AuthGate() {
    
    const [authed, setAuthed] = useState(() => isLoggedIn());

    const handleLogout = () => { clearToken(); setAuthed(false); };

    return authed
    ? <App onLogout={handleLogout} />
    : <LoginView onSuccess={() => setAuthed(true)} />;
    
}