import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AuthGate from "./AuthGate.jsx";
import { startDemoIfRequested } from "./lib/demo";

startDemoIfRequested()
  .catch((err) => console.error("Demo failed:", err))
  .finally(() => {
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <AuthGate />
      </StrictMode>
    );
  });