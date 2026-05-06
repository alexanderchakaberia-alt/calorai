import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { type ApiErrorResponse } from "@/lib/types";
import { setPastFoodFavorite } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id } = await ctx.params;
    if (!id) return jsonError("Missing id.", 400, "BAD_REQUEST");

    let body: { favorited?: unknown };
    try {
      body = (await req.json()) as { favorited?: unknown };
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    if (typeof body.favorited !== "boolean") {
      return jsonError("Body must include favorited (boolean).", 400, "BAD_REQUEST");
    }

    const updated = await setPastFoodFavorite(userId, id, body.favorited);
    return NextResponse.json({ item: updated });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to update favorite.");
  }
}
