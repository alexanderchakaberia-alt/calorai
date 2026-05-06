import { NextResponse } from "next/server";
import { type ApiErrorResponse } from "@/lib/types";
import { deleteMealEntry } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";

function jsonError(message: string, status = 400) {
  return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id } = await ctx.params;
    if (!id) return jsonError("Missing meal id.", 400);

    const res = await deleteMealEntry(id, userId);
    if (!res.deleted) return jsonError("Meal not found (or already deleted).", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete meal.";
    return jsonError(msg, 500);
  }
}
