import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk App Router session helper (replaces Pages Router `getAuth(req)`).
 * Use `userId` from the return value for Supabase rows (`user_id` columns).
 */
export async function getClerkAuth() {
  return auth();
}

/**
 * Returns the Clerk userId, or a 401 JSON response if unauthenticated.
 */
export async function requireUserId(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId };
}
