import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only administrative client.
 * Import only inside trusted server code. Never expose this client to the browser.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("El cliente administrativo no puede ejecutarse en el navegador.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY.");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
