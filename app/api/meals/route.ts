/**
 * Meal APIs — `userId` comes from Clerk (`auth()`), e.g. `user_xxx` (string). Database columns are TEXT.
 */
import { NextResponse } from "next/server";
import { apiErrorFromUnknown } from "@/lib/api-helpers";
import {
  type ApiErrorResponse,
  type CreateMealItemPayload,
  type CreateMealRequest,
  type CreateMealsBatchRequest,
  type GetMealsResponse,
  type ISODateString,
} from "@/lib/types";
import { addMealEntries, addMealEntry, getDailyTotals, getMealsForDate } from "@/lib/db";
import type { MealInsertPayload } from "@/lib/db";
import { requireUserId } from "@/lib/require-auth";
import { isSupabaseConfigured, supabaseNotConfiguredResponse } from "@/lib/server-env";

function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiErrorResponse>({ error: message, ...(code ? { code } : {}) }, { status });
}

function isISODate(s: string): s is ISODateString {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isNonNegFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function normalizeItemPayload(raw: Partial<CreateMealItemPayload>): MealInsertPayload | null {
  const food_name = typeof raw.food_name === "string" ? raw.food_name.trim() : "";
  if (!food_name) return null;
  const calories = Number(raw.calories);
  const protein = Number(raw.protein ?? 0);
  const fat = Number(raw.fat ?? 0);
  const carbs = Number(raw.carbs ?? 0);
  const fiber = raw.fiber !== undefined ? Number(raw.fiber) : 0;
  if (!isNonNegFinite(calories)) return null;
  if (!isNonNegFinite(protein) || !isNonNegFinite(fat) || !isNonNegFinite(carbs) || !isNonNegFinite(fiber)) return null;
  const portion = typeof raw.portion === "string" && raw.portion.trim() ? raw.portion.trim() : null;
  const out: MealInsertPayload = {
    food_name,
    portion,
    calories,
    protein,
    fat,
    carbs,
    fiber,
  };
  if ("ai_food_name" in raw) out.ai_food_name = raw.ai_food_name === null || raw.ai_food_name === undefined ? null : String(raw.ai_food_name);
  if ("ai_calories" in raw) out.ai_calories = raw.ai_calories === null || raw.ai_calories === undefined ? null : Number(raw.ai_calories);
  if ("ai_protein" in raw) out.ai_protein = raw.ai_protein === null || raw.ai_protein === undefined ? null : Number(raw.ai_protein);
  if ("ai_fat" in raw) out.ai_fat = raw.ai_fat === null || raw.ai_fat === undefined ? null : Number(raw.ai_fat);
  if ("ai_carbs" in raw) out.ai_carbs = raw.ai_carbs === null || raw.ai_carbs === undefined ? null : Number(raw.ai_carbs);
  if ("ai_confidence" in raw) out.ai_confidence = raw.ai_confidence === null || raw.ai_confidence === undefined ? null : Number(raw.ai_confidence);
  return out;
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

    let body: Partial<CreateMealRequest> & Partial<CreateMealsBatchRequest>;
    try {
      body = (await req.json()) as Partial<CreateMealRequest> & Partial<CreateMealsBatchRequest>;
    } catch {
      return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");
    }

    if (!body || typeof body !== "object") return jsonError("Invalid JSON body.", 400, "BAD_REQUEST");

    const date = body.date;
    if (!date || typeof date !== "string" || !isISODate(date)) return jsonError("Invalid or missing date.", 400);

    if (Array.isArray(body.items)) {
      if (body.items.length === 0) return jsonError("items array must contain at least one meal.", 400);
      const payloads: MealInsertPayload[] = [];
      for (let i = 0; i < body.items.length; i++) {
        const n = normalizeItemPayload(body.items[i] as Partial<CreateMealItemPayload>);
        if (!n) return jsonError(`Invalid meal at index ${i}. Check food_name and numeric fields.`, 400);
        payloads.push(n);
      }
      const meals = await addMealEntries(userId, date, payloads);
      return NextResponse.json({ meals });
    }

    const single = normalizeItemPayload(body as Partial<CreateMealItemPayload>);
    if (!single) return jsonError("food_name is required.", 400);

    const meal = await addMealEntry(userId, date, single);
    return NextResponse.json({ meal });
  } catch (err) {
    return apiErrorFromUnknown(err, "Failed to add meal.");
  }
}
