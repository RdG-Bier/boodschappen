import React from "react";
import { createRoot } from "react-dom/client";
import { configOk, SUPABASE_URL } from "./config.js";
import "./storage.js";
import App from "./App.jsx";

const root = document.getElementById("root");

/* ---------- noodluik: zet ?herstel achter de link ---------- */
async function wisAlles(ookLokaal) {
  try {
    if ("caches" in window) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (ookLokaal) localStorage.clear();
  } catch {}
}

function codesOpDitToestel() {
  try {
    const raw = localStorage.getItem("bd:local:bd:me:v1");
    if (!raw) return [];
    const me = JSON.parse(raw);
    return (me.houses || []).map((h) => ({
      naam: h.name,
      code: h.hh ? h.hh.slice(0, 4) + "-" + h.hh.slice(4) : "",
    }));
  } catch {
    return [];
  }
}

function herstelScherm(fouttekst) {
  const codes = codesOpDitToestel();
  root.innerHTML = `
    <div style="font-family:system-ui;padding:26px 20px;max-width:560px;margin:0 auto;color:#12271f;
                height:100%;overflow:auto;-webkit-overflow-scrolling:touch">
      <div style="font-size:34px">&#128736;</div>
      <h1 style="font-size:20px;margin:10px 0 8px">De app liep vast</h1>
      <p style="line-height:1.55;color:#4c6357;font-size:14.5px">
        Je lijst en historie staan veilig in de database. Alleen deze browser moet worden opgeschoond.
        Werk de knoppen van boven naar beneden af.
      </p>
      ${codes.length ? `
      <div style="background:#fdf6e6;border:1px solid #f0dfae;border-radius:10px;padding:13px;margin:16px 0;
                  font-size:13px;line-height:1.6;color:#6b5218">
        <b>Schrijf dit eerst op.</b> De laatste knop wist je codes.<br>
        ${codes.map((c) => `${c.naam}: <code style="font-family:ui-monospace,monospace">${c.code}</code>`).join("<br>")}
      </div>` : ""}
      <button id="b1" style="width:100%;padding:14px;border:0;border-radius:11px;background:#12271f;color:#fff;
              font-size:15px;font-weight:700;margin-top:8px">Opnieuw proberen</button>
      <button id="b2" style="width:100%;padding:14px;border:1px solid #dde3d5;border-radius:11px;background:#fff;
              color:#12271f;font-size:15px;font-weight:600;margin-top:10px">Opgeslagen versie weggooien</button>
      <button id="b3" style="width:100%;padding:14px;border:1px solid #e6c4bd;border-radius:11px;background:#fff;
              color:#b5432f;font-size:15px;font-weight:600;margin-top:10px">Alles op dit toestel wissen</button>
      <p style="font-size:12.5px;color:#8d9490;line-height:1.5;margin-top:8px">
        De laatste optie wist je naam en codes op dit toestel. Daarna vul je je naam in en doe je met de
        code hierboven weer mee. Je lijst blijft bestaan.
      </p>
      <p style="font-family:ui-monospace,monospace;font-size:11px;color:#8d9490;margin-top:22px;
                word-break:break-word;line-height:1.5">${String(fouttekst || "geen foutmelding").replace(/</g, "&lt;")}</p>
    </div>`;
  document.getElementById("b1").onclick = () => window.location.reload();
  document.getElementById("b2").onclick = async () => { await wisAlles(false); window.location.replace(window.location.pathname); };
  document.getElementById("b3").onclick = async () => { await wisAlles(true); window.location.replace(window.location.pathname); };
}

const meld = (tekst) => {
  let b = document.getElementById("bd-fout");
  if (!b) {
    b = document.createElement("div");
    b.id = "bd-fout";
    b.style.cssText =
      "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#7d2418;color:#fff;" +
      "font:11px/1.45 ui-monospace,monospace;padding:10px 34px 10px 12px;border-radius:9px;" +
      "max-height:38vh;overflow:auto;word-break:break-word";
    const x = document.createElement("button");
    x.textContent = "\u00d7";
    x.style.cssText = "position:absolute;top:4px;right:6px;background:none;border:0;color:#fff;font-size:20px;line-height:1";
    x.onclick = () => b.remove();
    b.appendChild(x);
    document.body.appendChild(b);
  }
  const p = document.createElement("div");
  p.textContent = tekst;
  b.appendChild(p);
};

if (window.location.search.indexOf("herstel") >= 0) {
  herstelScherm("handmatig geopend via ?herstel");
} else if (!configOk) {
  root.innerHTML = `
    <div style="font-family:system-ui;padding:32px 24px;max-width:520px;margin:0 auto;color:#12271f">
      <h1 style="font-size:20px;margin:0 0 12px">Supabase nog niet ingesteld</h1>
      <p style="line-height:1.6;color:#4c6357;font-size:15px">Vul in <code>src/config.js</code> je Project URL en key in.</p>
      <p style="font-family:ui-monospace,monospace;font-size:12px;color:#8d9490">nu: ${SUPABASE_URL}</p>
    </div>`;
} else {
  class Vangnet extends React.Component {
    constructor(p) {
      super(p);
      this.state = { fout: null };
    }
    static getDerivedStateFromError(e) {
      return { fout: e };
    }
    componentDidCatch(e) {
      setTimeout(() => herstelScherm(String((e && e.stack) || e)), 0);
    }
    render() {
      return this.state.fout ? null : this.props.children;
    }
  }

  createRoot(root).render(
    <Vangnet>
      <App />
    </Vangnet>
  );

  window.addEventListener("error", (e) =>
    meld("fout: " + (e.message || "") + " @ " + (e.filename || "").split("/").pop() + ":" + (e.lineno || ""))
  );
  window.addEventListener("unhandledrejection", (e) =>
    meld("openstaande fout: " + String((e.reason && (e.reason.stack || e.reason.message)) || e.reason))
  );

  if ("serviceWorker" in navigator) {
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
