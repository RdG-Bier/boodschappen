import React from "react";
import { createRoot } from "react-dom/client";
import { configOk, SUPABASE_URL } from "./config.js";
import "./storage.js";
import App from "./App.jsx";

const root = document.getElementById("root");

if (!configOk) {
  root.innerHTML = `
    <div style="font-family:system-ui;padding:32px 24px;max-width:520px;margin:0 auto;color:#12271f">
      <h1 style="font-size:20px;margin:0 0 12px">Supabase nog niet ingesteld</h1>
      <p style="line-height:1.6;color:#4c6357;font-size:15px">
        Open <code>src/config.js</code> en vul je Project URL en anon key in.
      </p>
      <p style="font-family:ui-monospace,monospace;font-size:12px;color:#8d9490">nu ingesteld: ${SUPABASE_URL}</p>
    </div>`;
} else {
  createRoot(root).render(<App />);

  if ("serviceWorker" in navigator) {
    /* nieuwe versie? dan eenmalig herladen zodat je nooit op oude code blijft hangen */
    let bezig = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (bezig) return;
      bezig = true;
      window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then((reg) => {
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }).catch(() => {});
    });
  }
}
