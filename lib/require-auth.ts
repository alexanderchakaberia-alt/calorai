import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/lib/types";

/**
 * Clerk App Router session helper (same as `auth()` — use for advanced cases).
 * Prefer `requireUserId()` in API routes; it catches Clerk misconfiguration on Vercel.
 */
export async function getClerkAuth() {
  return auth();
}

/**
 * Returns the Clerk userId, or a JSON response if unauthenticated / misconfigured.
 * Wraps `auth()` in try/catch because missing/invalid Clerk keys on Vercel can throw.
 */
export async function requireUserId(): Promise<{ userId: string } | NextResponse<ApiErrorResponse>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiErrorResponse>({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    return { userId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Clerk] requireUserId / auth():", err);
    return NextResponse.json(
      {
        error:
          "Could not verify your session. On Vercel, set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for this deployment environment and redeploy.",
        code: "CLERK_AUTH_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
