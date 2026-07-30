/* Vult window.storage en window.huis, zodat App.jsx niets van Supabase hoeft te weten.
     gedeeld (catalogus, lijst, historie, leden) -> Supabase
     persoonlijk (je naam, je codes)            -> localStorage van deze browser
   Alle databasetoegang loopt via functies (rpc). De tabel zelf is dichtgezet,
   dus niemand kan met de publieke key even alle huishoudens uitlezen. */

import { SUPABASE_URL, SUPABASE_ANON } from "./config.js";

const LOKAAL = "bd:local:";

async function rpc(fn, args = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

const lokaal = {
  get(key) {
    const v = localStorage.getItem(LOKAAL + key);
    return v === null ? null : { key, value: v, shared: false };
  },
  set(key, value) {
    localStorage.setItem(LOKAAL + key, value);
    return { key, value, shared: false };
  },
  delete(key) {
    localStorage.removeItem(LOKAAL + key);
    return { key, deleted: true, shared: false };
  },
  list(prefix = "") {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOKAAL + prefix)) keys.push(k.slice(LOKAAL.length));
    }
    return { keys, prefix, shared: false };
  },
};

const storage = {
  async get(key, shared = false) {
    if (!shared) return lokaal.get(key);
    const v = await rpc("kv_get", { p_key: key });
    return v === null || v === undefined ? null : { key, value: v, shared: true };
  },
  async set(key, value, shared = false) {
    if (!shared) return lokaal.set(key, value);
    await rpc("kv_set", { p_key: key, p_value: value });
    return { key, value, shared: true };
  },
  async delete(key, shared = false) {
    if (!shared) return lokaal.delete(key);
    await rpc("kv_del", { p_key: key });
    return { key, deleted: true, shared: true };
  },
  async list(prefix = "", shared = false) {
    if (!shared) return lokaal.list(prefix);
    return { keys: [], prefix, shared: true };
  },
};

const huis = {
  add: (code, naam) => rpc("huis_add", { p_hh: code, p_name: naam }),
  index: async () => (await rpc("huis_index")) || [],
  zoek: (pre, rest) => rpc("huis_zoek", { p_pre: pre, p_rest: rest }),
};

if (typeof window !== "undefined") {
  if (!window.storage) window.storage = storage;
  if (!window.huis) window.huis = huis;
}

export default storage;
