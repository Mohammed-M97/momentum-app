import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/* PWA: makes Momentum installable as its own app (home-screen icon on the
   phone, its own window on the desktop) instead of living in a browser tab.

   - manifest      name, icons, colors, and the long-press shortcuts
   - service worker caches the built app shell so it opens instantly.
     API calls go to another origin (VITE_API_URL), so the worker never
     caches or intercepts your data; it is always live from the server.
   - autoUpdate    a new deploy on Netlify is picked up on the next open. */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Momentum",
        short_name: "Momentum",
        description: "Goals you can see, tasks small enough to finish.",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#14150f",
        theme_color: "#14150f",
        lang: "ar",
        dir: "auto",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        /* Long-press the app icon on Android to jump straight here. */
        shortcuts: [
          {
            name: "اليوم",
            short_name: "اليوم",
            url: "/?tab=today&source=shortcut",
            icons: [{ src: "/icons/shortcut-today.png", sizes: "96x96", type: "image/png" }],
          },
          {
            name: "إضافة مهمة",
            short_name: "مهمة جديدة",
            url: "/?tab=tasks&new=1&source=shortcut",
            icons: [{ src: "/icons/shortcut-add.png", sizes: "96x96", type: "image/png" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  server: {
    open: true,
  },
});
