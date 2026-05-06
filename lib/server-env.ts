import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/types";

/**
 * Supabase is usable if we have project URL plus either anon key (typical) or service role (server, RLS bypass).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && (anon || service));
}

export function isGroqConfigured(): boolean {
  const key = (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY)?.trim();
  return Boolean(key);
}

export function isClerkPublishableSet(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function isClerkSecretSet(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

export function supabaseNotConfiguredResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error:
        "Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY on the server). Redeploy after saving env vars.",
      code: "SUPABASE_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}

export function groqNotConfiguredResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error:
        "Food analysis is not configured. Set GROQ_API_KEY (server-only) in Vercel environment variables and redeploy.",
      code: "GROQ_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}
