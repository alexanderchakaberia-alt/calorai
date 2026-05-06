/**
 * JS shim — app code should import from `./supabase.ts` (or `@/lib/supabase`).
 * Kept for setups that expect a `.js` entry next to the server client.
 */
export { assertClerkUserId, getSupabase, getSupabaseForClerkUser } from "./supabase.ts";
