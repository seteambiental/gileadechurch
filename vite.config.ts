import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.jpeg", "logo-192.jpeg", "logo-512.jpeg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        // Force new SW to activate immediately, skipping waiting
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache anything except the app shell — always fetch fresh
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(js|css|html)(\?.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1h max
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-assets",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
            },
          },
        ],
      },
      manifest: {
        name: "Gileade Church",
        short_name: "Gileade",
        description: "Gileade Church - Um Lugar de Cura e Restauração",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/logo-192.jpeg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "/logo-512.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
          },
          {
            src: "/logo-512.jpeg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
