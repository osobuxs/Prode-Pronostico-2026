import { createClient } from "@supabase/supabase-js";

// ── Cliente PÚBLICO (browser / server components) ───────────────
// Usa la anon key. Solo puede LEER (por las políticas RLS).
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copiá env.example a .env.local."
    );
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

// ── Cliente ADMIN (solo scripts/cron del servidor) ──────────────
// Usa la service_role key: saltea RLS y puede ESCRIBIR.
// NUNCA importar esto desde un componente que corra en el browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY para escritura (scripts)."
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
