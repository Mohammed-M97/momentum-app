import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AuthGate from "./AuthGate.jsx";
import { startDemoIfRequested } from "./lib/demo";
import { I18nProvider } from "./lib/i18n.js";
import { captureLaunchIntent } from "./lib/launch.js";
import { listenForInstall } from "./lib/install.js";

captureLaunchIntent();
listenForInstall();

startDemoIfRequested()
  .catch((err) => console.error("Demo failed:", err))
  .finally(() => {
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <I18nProvider>
          <AuthGate />
        </I18nProvider>
      </StrictMode>
    );
  });
