import { NextResponse } from "next/server";
import {
  isClerkPublishableSet,
  isClerkSecretSet,
  isGroqConfigured,
  isSupabaseConfigured,
} from "@/lib/server-env";

/**
 * Public diagnostics: which env vars are present (boolean only — never exposes secrets).
 * Use after deploying to Vercel to confirm runtime sees your keys.
 */
export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnon,
    SUPABASE_SERVICE_ROLE_KEY: hasServiceRole,
    supabaseUsable: isSupabaseConfigured(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: isClerkPublishableSet(),
    CLERK_SECRET_KEY: isClerkSecretSet(),
    GROQ_API_KEY: isGroqConfigured(),
  };

  const ok =
    env.supabaseUsable &&
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.CLERK_SECRET_KEY;

  const tips: string[] = [];
  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
    tips.push("Add Clerk keys for Production (and Preview if you use preview deployments), then Redeploy.");
  }
  if (hasSupabaseUrl && !hasAnon && !hasServiceRole) {
    tips.push("Add NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY (server-only on Vercel).");
  }
  if (hasAnon && !hasServiceRole) {
    tips.push(
      "If API returns SUPABASE_RLS_OR_POLICY, either relax RLS policies in Supabase or add SUPABASE_SERVICE_ROLE_KEY (server-only)."
    );
  }
  tips.push("In Clerk Dashboard → Domains, allow your Vercel URL (e.g. *.vercel.app) and custom domain.");

  return NextResponse.json({
    ok,
    env,
    vercel: process.env.VERCEL === "1",
    tips,
  });
}
