import { NextResponse } from "next/server";
import { DEMO_USER_ID, type ApiErrorResponse, type CreateMealRequest, type GetMealsResponse, type ISODateString } from "@/lib/types";
import { addMealEntry, getDailyTotals, getMealsForDate } from "@/lib/db";

function jsonError(message: string, status = 400) {
  return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
}

function isISODate(s: string): s is ISODateString {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) return jsonError("Missing required query param: date (YYYY-MM-DD).", 400);
    if (!isISODate(date)) return jsonError("Invalid date format. Expected YYYY-MM-DD.", 400);

    const meals = getMealsForDate(DEMO_USER_ID, date);
    const totals = getDailyTotals(DEMO_USER_ID, date);
    return NextResponse.json<GetMealsResponse>({ date, meals, totals });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch meals.";
    return jsonError(msg, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreateMealRequest>;
    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.", 400);

    const date = body.date;
    if (!date || typeof date !== "string" || !isISODate(date)) return jsonError("Invalid or missing date.", 400);

    const meal_name = typeof body.meal_name === "string" ? body.meal_name.trim() : "";
    if (!meal_name) return jsonError("Meal name is required.", 400);

    const calories = Number(body.calories);
    const protein = Number(body.protein ?? 0);
    const fat = Number(body.fat ?? 0);
    const carbs = Number(body.carbs ?? 0);

    if (!Number.isFinite(calories) || calories < 0) return jsonError("Calories must be a non-negative number.", 400);
    if (!Number.isFinite(protein) || protein < 0) return jsonError("Protein must be a non-negative number.", 400);
    if (!Number.isFinite(fat) || fat < 0) return jsonError("Fat must be a non-negative number.", 400);
    if (!Number.isFinite(carbs) || carbs < 0) return jsonError("Carbs must be a non-negative number.", 400);

    const portion_size =
      typeof body.portion_size === "string" && body.portion_size.trim() ? body.portion_size.trim() : undefined;

    const meal = addMealEntry(DEMO_USER_ID, date, {
      meal_name,
      calories,
      protein,
      fat,
      carbs,
      portion_size: portion_size ?? null,
    });

    return NextResponse.json({ meal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add meal.";
    return jsonError(msg, 500);
  }
}

