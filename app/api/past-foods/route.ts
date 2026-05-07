import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { type ApiErrorResponse, type GetPastFoodsResponse, type UpsertPastFoodRequest } from "@/lib/types";
import { getPastFoodsForUser, upsertPastFoodDirect } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

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

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    let body: Partial<UpsertPastFoodRequest>;
    try {
      body = (await req.json()) as Partial<UpsertPastFoodRequest>;
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    const food_name = typeof body.food_name === "string" ? body.food_name.trim() : "";
    if (!food_name) return jsonError("food_name is required.", 400, "BAD_REQUEST");

    const calories = Number(body.calories);
    const protein = Number(body.protein ?? 0);
    const fat = Number(body.fat ?? 0);
    const carbs = Number(body.carbs ?? 0);
    const fiber = body.fiber !== undefined ? Number(body.fiber) : 0;
    const favorited = body.favorited;

    if (typeof favorited !== "boolean") return jsonError("favorited must be boolean.", 400, "BAD_REQUEST");
    for (const [k, v] of [
      ["calories", calories],
      ["protein", protein],
      ["fat", fat],
      ["carbs", carbs],
      ["fiber", fiber],
    ] as const) {
      if (!Number.isFinite(v) || v < 0) return jsonError(`${k} must be a non-negative number.`, 400, "BAD_REQUEST");
    }

    const portion = typeof body.portion === "string" && body.portion.trim() ? body.portion.trim() : null;

    const item = await upsertPastFoodDirect(userId, {
      food_name,
      portion,
      calories,
      protein,
      fat,
      carbs,
      fiber,
      favorited,
    });

    return NextResponse.json({ item });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to upsert past food.");
  }
}
