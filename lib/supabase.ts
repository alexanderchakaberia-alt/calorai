import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Clerk user id (string) must be passed into `lib/db` functions so every query filters by `user_id`.
 *
 * **Security:** If `SUPABASE_SERVICE_ROLE_KEY` is set (server only), it bypasses RLS — you must keep
 * filtering by `user_id` in all queries (see `lib/db.ts`). Never expose the service role to the browser.
 */
export function assertClerkUserId(userId: string | null | undefined): asserts userId is string {
  if (!userId || typeof userId !== "string") {
    throw new Error("Clerk user id is required for database access.");
  }
}

/**
 * Lazy client. Uses `SUPABASE_SERVICE_ROLE_KEY` when set (recommended on Vercel if RLS blocks the anon key),
 * otherwise `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it in Vercel → Environment Variables and redeploy."
    );
  }

  const key = serviceKey || anonKey;
  if (!key) {
    throw new Error(
      "Missing Supabase credentials: set NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY (server-only) if Row Level Security blocks API requests."
    );
  }

  client = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
}

/**
 * Same client as `getSupabase()`; call after resolving Clerk `userId` on the server.
 */
export function getSupabaseForClerkUser(userId: string): SupabaseClient {
  assertClerkUserId(userId);
  return getSupabase();
}
