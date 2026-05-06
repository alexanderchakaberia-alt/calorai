import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { type GetPastFoodsResponse } from "@/lib/types";
import { getPastFoodsForUser } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const items = await getPastFoodsForUser(userId);
    return NextResponse.json<GetPastFoodsResponse>({ items });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to load food library.");
  }
}
