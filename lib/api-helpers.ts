import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/types";

export function apiJsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

/**
 * Maps infrastructure / config errors to 503; keeps user-facing messages safe.
 */
export function apiErrorFromUnknown(err: unknown, fallback: string): NextResponse<ApiErrorResponse> {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("next_public_supabase") ||
    lower.includes("supabase_url") ||
    lower.includes("supabase_anon") ||
    lower.includes("supabase credentials")
  ) {
    return NextResponse.json(
      {
        error:
          "Database is not configured. Add NEXT_PUBLIC_SUPABASE_URL and a Supabase key on the server and redeploy.",
        code: "SUPABASE_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("row level security") ||
    lower.includes("violates row-level security") ||
    (lower.includes("permission denied") && lower.includes("policy")) ||
    (lower.includes("jwt") && lower.includes("supabase"))
  ) {
    return NextResponse.json(
      {
        error:
          "Supabase rejected the query (often Row Level Security). Fix: in Supabase, add policies for your tables, or set SUPABASE_SERVICE_ROLE_KEY in Vercel (server-only; this app filters every query by Clerk user_id). Redeploy after changing env.",
        code: "SUPABASE_RLS_OR_POLICY",
      },
      { status: 503 }
    );
  }

  if (lower.includes("clerk user id is required")) {
    return apiJsonError("Invalid session for database access.", 401, "INVALID_SESSION");
  }

  return NextResponse.json<ApiErrorResponse>({ error: msg || fallback, code: "INTERNAL" }, { status: 500 });
}
