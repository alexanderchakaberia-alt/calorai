/**
 * All `userId` arguments are Clerk user ids (strings like `user_…`). Supabase `users.id`, `meal_logs.user_id`,
 * `daily_goals.user_id`, and `past_foods.user_id` must be TEXT — see `supabase/migrations/*_clerk_user_id_text.sql`.
 */
import { assertClerkUserId, getSupabaseForClerkUser } from "./supabase";
import type { DailyGoals, ISODateString, MacroTotals, MealEntry, PastFoodEntry } from "./types";

const DEFAULTS = Object.freeze({
  calorie_goal: 2000,
  protein_goal: 150,
  fat_goal: 65,
  carbs_goal: 225,
  fiber_goal: 30,
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

function mapPastFood(row: Record<string, unknown>): PastFoodEntry {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    food_name: row.food_name as string,
    food_key: row.food_key as string,
    portion: (row.portion as string | null) ?? null,
    calories: toNumber(row.calories),
    protein: toNumber(row.protein),
    fat: toNumber(row.fat),
    carbs: toNumber(row.carbs),
    last_used_at: row.last_used_at as string,
    use_count: Math.max(0, Math.floor(toNumber(row.use_count))),
    favorited: Boolean(row.favorited),
  };
}

function mapGoals(row: Record<string, unknown>): DailyGoals {
  const fiber = row.fiber_goal;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    calorie_goal: toNumber(row.calorie_goal),
    protein_goal: toNumber(row.protein_goal),
    fat_goal: toNumber(row.fat_goal),
    carbs_goal: toNumber(row.carbs_goal),
    fiber_goal: fiber !== undefined && fiber !== null ? toNumber(fiber) : DEFAULTS.fiber_goal,
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
  goals: Partial<Pick<DailyGoals, "calorie_goal" | "protein_goal" | "fat_goal" | "carbs_goal" | "fiber_goal">>
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
    fiber_goal:
      goals.fiber_goal !== undefined
        ? Math.max(0, Math.floor(goals.fiber_goal))
        : (existing.fiber_goal ?? DEFAULTS.fiber_goal),
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

export function foodKeyFromName(foodName: string): string {
  return foodName.trim().toLowerCase();
}

/**
 * After logging a meal, upsert `past_foods` (increment use_count / refresh macros when same food_key).
 */
export async function upsertPastFoodFromMeal(
  userId: string,
  meal: Pick<MealEntry, "food_name" | "calories" | "protein" | "fat" | "carbs" | "portion">
): Promise<void> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);
  await ensureUser(userId);

  const name = meal.food_name.trim();
  if (!name) return;

  const foodKey = foodKeyFromName(name);
  const now = new Date().toISOString();
  const calories = Math.max(0, Math.floor(meal.calories));
  const protein = Math.max(0, toNumber(meal.protein));
  const fat = Math.max(0, toNumber(meal.fat));
  const carbs = Math.max(0, toNumber(meal.carbs));
  const portion = meal.portion?.trim() || null;

  const { data: existing, error: selErr } = await supabase
    .from("past_foods")
    .select("id, use_count")
    .eq("user_id", userId)
    .eq("food_key", foodKey)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  if (existing) {
    const prevCount = Number((existing as { use_count?: unknown }).use_count ?? 0);
    const { error: upErr } = await supabase
      .from("past_foods")
      .update({
        use_count: prevCount + 1,
        last_used_at: now,
        food_name: name,
        portion,
        calories,
        protein,
        fat,
        carbs,
      })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (upErr) throw new Error(upErr.message);
    return;
  }

  const { error: insErr } = await supabase.from("past_foods").insert({
    user_id: userId,
    food_name: name,
    food_key: foodKey,
    portion,
    calories,
    protein,
    fat,
    carbs,
    last_used_at: now,
    use_count: 1,
    favorited: false,
  });

  if (insErr) throw new Error(insErr.message);
}

export async function getPastFoodsForUser(userId: string): Promise<PastFoodEntry[]> {
  assertClerkUserId(userId);
  await ensureUser(userId);
  const supabase = getSupabaseForClerkUser(userId);

  const { data, error } = await supabase.from("past_foods").select("*").eq("user_id", userId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []).map(mapPastFood);
  rows.sort((a, b) => {
    if (a.favorited !== b.favorited) return a.favorited ? -1 : 1;
    const ta = new Date(a.last_used_at).getTime();
    const tb = new Date(b.last_used_at).getTime();
    if (tb !== ta) return tb - ta;
    return b.use_count - a.use_count;
  });
  return rows;
}

export async function setPastFoodFavorite(userId: string, pastFoodId: string, favorited: boolean): Promise<PastFoodEntry> {
  assertClerkUserId(userId);
  const supabase = getSupabaseForClerkUser(userId);

  const { data, error } = await supabase
    .from("past_foods")
    .update({ favorited })
    .eq("id", pastFoodId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update favorite.");
  return mapPastFood(data);
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
  const entry = mapMeal(data);

  try {
    await upsertPastFoodFromMeal(userId, meal);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[past_foods] upsert failed (run supabase migration if table missing):", e);
  }

  return entry;
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
