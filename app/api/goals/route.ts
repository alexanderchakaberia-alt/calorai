/**
 * Goals API — `userId` is Clerk’s string id; `daily_goals.user_id` in Supabase must be TEXT.
 */
import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { type ApiErrorResponse, type GetGoalsResponse, type UpdateGoalsRequest } from "@/lib/types";
import { provisionClerkUser, upsertDailyGoals } from "@/lib/db";
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

    const goals = await provisionClerkUser(userId);
    return NextResponse.json<GetGoalsResponse>({ goals });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to fetch goals.");
  }
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    let body: Partial<UpdateGoalsRequest>;
    try {
      body = (await req.json()) as Partial<UpdateGoalsRequest>;
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");

    const next = {
      calorie_goal: body.calorie_goal !== undefined ? Number(body.calorie_goal) : undefined,
      protein_goal: body.protein_goal !== undefined ? Number(body.protein_goal) : undefined,
      fat_goal: body.fat_goal !== undefined ? Number(body.fat_goal) : undefined,
      carbs_goal: body.carbs_goal !== undefined ? Number(body.carbs_goal) : undefined,
      fiber_goal: body.fiber_goal !== undefined ? Number(body.fiber_goal) : undefined,
    };

    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) continue;
      if (!Number.isFinite(v) || v < 0) return jsonError(`${k} must be a non-negative number.`, 400);
    }

    const goals = await upsertDailyGoals(userId, next);
    return NextResponse.json<GetGoalsResponse>({ goals });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to update goals.");
  }
}
