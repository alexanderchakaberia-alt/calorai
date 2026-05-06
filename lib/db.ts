import { assertClerkUserId, getSupabaseForClerkUser } from "./supabase";
import type { DailyGoals, ISODateString, MacroTotals, MealEntry } from "./types";

const DEFAULTS = Object.freeze({
  calorie_goal: 2000,
  protein_goal: 150,
  fat_goal: 65,
  carbs_goal: 225,
});

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapMeal(row: Record<string, unknown>): MealEntry {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    food_name: row.food_name as string,
    portion: (row.portion as string | null) ?? null,
    calories: toNumber(row.calories),
    protein: toNumber(row.protein),
    fat: toNumber(row.fat),
    carbs: toNumber(row.carbs),
    logged_at: row.logged_at as string,
  };
}

function mapGoals(row: Record<string, unknown>): DailyGoals {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    calorie_goal: toNumber(row.calorie_goal),
    protein_goal: toNumber(row.protein_goal),
    fat_goal: toNumber(row.fat_goal),
    carbs_goal: toNumber(row.carbs_goal),
  };
}

function nextCalendarDayUTC(date: ISODateString): ISODateString {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) as ISODateString;
}

async function ensureUser(userId: string): Promise<void> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  await supabase
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
}

/**
 * Ensures `users` row and default `daily_goals` (2000 kcal, etc.) for a new Clerk user.
 */
export async function provisionClerkUser(userId: string): Promise<DailyGoals> {
  return getDailyGoals(userId);
}

export async function getDailyGoals(userId: string): Promise<DailyGoals> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  await ensureUser(userId);

  const { data } = await supabase
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) return mapGoals(data);

  const { data: created, error } = await supabase
    .from("daily_goals")
    .insert({ user_id: userId, ...DEFAULTS })
    .select()
    .single();

  if (error || !created) throw new Error("Failed to create daily goals.");
  return mapGoals(created);
}

export async function upsertDailyGoals(
  userId: string,
  goals: Partial<Pick<DailyGoals, "calorie_goal" | "protein_goal" | "fat_goal" | "carbs_goal">>
): Promise<DailyGoals> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  await ensureUser(userId);

  const existing = await getDailyGoals(userId);

  const next = {
    calorie_goal: goals.calorie_goal !== undefined ? Math.max(0, Math.floor(goals.calorie_goal)) : existing.calorie_goal,
    protein_goal: goals.protein_goal !== undefined ? Math.max(0, Math.floor(goals.protein_goal)) : existing.protein_goal,
    fat_goal: goals.fat_goal !== undefined ? Math.max(0, Math.floor(goals.fat_goal)) : existing.fat_goal,
    carbs_goal: goals.carbs_goal !== undefined ? Math.max(0, Math.floor(goals.carbs_goal)) : existing.carbs_goal,
  };

  const { data, error } = await supabase
    .from("daily_goals")
    .upsert({ user_id: userId, ...next }, { onConflict: "user_id" })
    .select()
    .single();

  if (error || !data) throw new Error("Failed to update daily goals.");
  return mapGoals(data);
}

export async function getMealsForDate(userId: string, date: ISODateString): Promise<MealEntry[]> {
  assertClerkUserId(userId);
  await ensureUser(userId);
  const supabase = getSupabaseForClerkUser(userId);
  const nextDay = nextCalendarDayUTC(date);
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", `${date}T00:00:00.000Z`)
    .lt("logged_at", `${nextDay}T00:00:00.000Z`)
    .order("logged_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMeal);
}

export async function getDailyTotals(userId: string, date: ISODateString): Promise<MacroTotals> {
  const meals = await getMealsForDate(userId, date);
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

export async function addMealEntry(
  userId: string,
  date: ISODateString,
  meal: Pick<MealEntry, "food_name" | "calories" | "protein" | "fat" | "carbs" | "portion">
): Promise<MealEntry> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  await ensureUser(userId);

  const { data, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: userId,
      food_name: meal.food_name.trim(),
      portion: meal.portion?.trim() || null,
      calories: Math.max(0, Math.floor(meal.calories)),
      protein: Math.max(0, toNumber(meal.protein)),
      fat: Math.max(0, toNumber(meal.fat)),
      carbs: Math.max(0, toNumber(meal.carbs)),
      logged_at: new Date(`${date}T12:00:00.000Z`).toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add meal.");
  return mapMeal(data);
}

export async function deleteMealEntry(mealId: string, userId: string): Promise<{ deleted: boolean }> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  const { error, count } = await supabase
    .from("meal_logs")
    .delete({ count: "exact" })
    .eq("id", mealId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return { deleted: (count ?? 0) > 0 };
}
