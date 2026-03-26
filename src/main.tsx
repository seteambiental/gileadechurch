import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const shouldDisableServiceWorker = isInIframe || isPreviewHost;

const clearBrowserCaches = async () => {
  if (!("caches" in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
};

if ("serviceWorker" in navigator) {
  if (shouldDisableServiceWorker) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .finally(() => {
        void clearBrowserCaches();
      });
  } else {
    let hasRefreshed = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasRefreshed) return;
      hasRefreshed = true;
      window.location.reload();
    });

    if (import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Erro ao registrar service worker:", error);
      });
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.update();
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
