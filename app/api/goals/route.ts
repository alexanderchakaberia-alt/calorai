import { NextResponse } from "next/server";
import { DEMO_USER_ID, type ApiErrorResponse, type GetGoalsResponse, type UpdateGoalsRequest } from "@/lib/types";
import { getDailyGoals, upsertDailyGoals } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
}

export async function GET() {
  try {
    const goals = await getDailyGoals(DEMO_USER_ID);
    return NextResponse.json<GetGoalsResponse>({ goals });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch goals.";
    return jsonError(msg, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UpdateGoalsRequest>;
    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.", 400);

    const next = {
      calorie_goal: body.calorie_goal !== undefined ? Number(body.calorie_goal) : undefined,
      protein_goal: body.protein_goal !== undefined ? Number(body.protein_goal) : undefined,
      fat_goal: body.fat_goal !== undefined ? Number(body.fat_goal) : undefined,
      carbs_goal: body.carbs_goal !== undefined ? Number(body.carbs_goal) : undefined,
    };

    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) continue;
      if (!Number.isFinite(v) || v < 0) return jsonError(`${k} must be a non-negative number.`, 400);
    }

    const goals = await upsertDailyGoals(DEMO_USER_ID, next);
    return NextResponse.json<GetGoalsResponse>({ goals });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update goals.";
    return jsonError(msg, 500);
  }
}
