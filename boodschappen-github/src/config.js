/* ====== Supabase-gegevens ======
   Project: ubhpfkbxvfhcemcbhcxh
   De publishable key hoort publiek te zijn en mag in de repo staan.
   Zet hier NOOIT een sleutel die met sb_secret_ of eyJ... begint en
   service_role heet: die geeft volledige toegang tot je database.

   Wil je de waarden liever niet in de repo, zet ze dan als repository
   secrets VITE_SUPABASE_URL en VITE_SUPABASE_ANON; de workflow pakt ze op.
   =============================== */

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ubhpfkbxvfhcemcbhcxh.supabase.co";

export const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON || "sb_publishable_pjmhRTjiBMiMelW7Jghf1w_oHuPUbGE";

export const configOk = SUPABASE_URL.startsWith("https://") && SUPABASE_ANON.length > 20;
