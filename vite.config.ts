import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: null,
      registerType: "autoUpdate",
      manifest: {
        name: "Trail Junction",
        short_name: "Trail Junction",
        description: "Find trail maps, read signs, and keep a journal of your hikes.",
        theme_color: "#faf8ee",
        background_color: "#faf8ee",
        display: "standalone",
        id: "/",
        start_url: "/app",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,woff2,webmanifest}", "trails/parus-topo.jpg"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
