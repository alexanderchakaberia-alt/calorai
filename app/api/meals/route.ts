/**
 * Meal APIs — `userId` comes from Clerk (`auth()`), e.g. `user_xxx` (string). Database columns are TEXT.
 */
import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import { type ApiErrorResponse, type CreateMealRequest, type GetMealsResponse, type ISODateString } from "@/lib/types";
import { addMealEntry, getDailyTotals, getMealsForDate } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

function isISODate(s: string): s is ISODateString {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) return jsonError("Missing required query param: date (YYYY-MM-DD).", 400, "BAD_REQUEST");
    if (!isISODate(date)) return jsonError("Invalid date format. Expected YYYY-MM-DD.", 400, "BAD_REQUEST");

    const [meals, totals] = await Promise.all([
      getMealsForDate(userId, date),
      getDailyTotals(userId, date),
    ]);
    return NextResponse.json<GetMealsResponse>({ date, meals, totals });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to fetch meals.");
  }
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

    const authResult = await requireUserId();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    let body: Partial<CreateMealRequest>;
    try {
      body = (await req.json()) as Partial<CreateMealRequest>;
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");

    const date = body.date;
    if (!date || typeof date !== "string" || !isISODate(date)) return jsonError("Invalid or missing date.", 400);

    const food_name = typeof body.food_name === "string" ? body.food_name.trim() : "";
    if (!food_name) return jsonError("food_name is required.", 400);

    const calories = Number(body.calories);
    const protein = Number(body.protein ?? 0);
    const fat = Number(body.fat ?? 0);
    const carbs = Number(body.carbs ?? 0);

    if (!Number.isFinite(calories) || calories < 0) return jsonError("Calories must be a non-negative number.", 400);
    if (!Number.isFinite(protein) || protein < 0) return jsonError("Protein must be a non-negative number.", 400);
    if (!Number.isFinite(fat) || fat < 0) return jsonError("Fat must be a non-negative number.", 400);
    if (!Number.isFinite(carbs) || carbs < 0) return jsonError("Carbs must be a non-negative number.", 400);

    const portion = typeof body.portion === "string" && body.portion.trim() ? body.portion.trim() : undefined;

    const meal = await addMealEntry(userId, date, {
      food_name,
      calories,
      protein,
      fat,
      carbs,
      portion: portion ?? null,
    });

    return NextResponse.json({ meal });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to add meal.");
  }
}
