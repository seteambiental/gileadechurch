import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear all caches on every app load to guarantee latest version
if ("caches" in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
}

// Force service worker update check on every page load and reload when a new worker takes control
if ("serviceWorker" in navigator) {
  let hasRefreshed = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasRefreshed) return;
    hasRefreshed = true;
    window.location.reload();
  });

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
