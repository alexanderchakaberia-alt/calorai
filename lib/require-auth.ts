import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * App Router: uses Clerk's `auth()` (same session as `getAuth(req)` on Pages API).
 * Returns the Clerk userId, or a 401 JSON response if unauthenticated.
 */
export async function requireUserId(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId };
}
