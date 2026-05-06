import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Clerk user id (string) must be passed into `lib/db` functions so every query filters by `user_id`.
 * This module only provides the anon Supabase client — **row-level scoping happens in `lib/db.ts`**.
 */
export function assertClerkUserId(userId: string | null | undefined): asserts userId is string {
  if (!userId || typeof userId !== "string") {
    throw new Error("Clerk user id is required for database access.");
  }
}

/**
 * Lazy client — avoids crashing the server bundle at import time when env is missing
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

/**
 * Same client as `getSupabase()`; use in server code right after resolving Clerk `userId` for clearer call sites.
 */
export function getSupabaseForClerkUser(userId: string): SupabaseClient {
  assertClerkUserId(userId);
  return getSupabase();
}
