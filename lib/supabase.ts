import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy client — avoids crashing the whole server bundle at import time when env is missing
 * (e.g. Vercel without `NEXT_PUBLIC_SUPABASE_*`). Fails only when DB is actually used.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them in Vercel → Project → Settings → Environment Variables (and redeploy)."
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
