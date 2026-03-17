import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear old caches on every app load to guarantee latest version
if ("caches" in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      // Keep only the runtime caches we explicitly defined
      if (!name.startsWith("app-assets") && !name.startsWith("image-assets")) {
        caches.delete(name);
      }
    }
  });
}

// Force service worker update check on every page load
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
