export type ISODateString = `${number}-${number}-${number}`; // YYYY-MM-DD

export type MacroTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type DailyGoals = {
  id: string;
  /** Clerk user id — stored as `text` in Supabase, not UUID */
  user_id: string;
  calorie_goal: number;
  protein_goal: number;
  fat_goal: number;
  carbs_goal: number;
  /** Daily fiber target (g) — optional for legacy rows */
  fiber_goal?: number;
};

export type MealEntry = {
  id: string;
  /** Clerk user id — stored as `text` in Supabase, not UUID */
  user_id: string;
  food_name: string;
  portion: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  logged_at: string;
};

export type GetMealsResponse = {
  date: ISODateString;
  meals: MealEntry[];
  totals: MacroTotals;
};

export type GetGoalsResponse = {
  goals: DailyGoals;
};

export type ApiErrorResponse = {
  error: string;
  /** Machine-readable reason for clients (e.g. SUPABASE_NOT_CONFIGURED). */
  code?: string;
};

export type CreateMealRequest = {
  date: ISODateString;
  food_name: string;
  portion?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type UpdateGoalsRequest = {
  calorie_goal?: number;
  protein_goal?: number;
  fat_goal?: number;
  carbs_goal?: number;
  fiber_goal?: number;
};

/** Remembered food row in `past_foods` (Food Library). */
export type PastFoodEntry = {
  id: string;
  /** Clerk user id (TEXT in DB) */
  user_id: string;
  food_name: string;
  food_key: string;
  portion: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  last_used_at: string;
  use_count: number;
  favorited: boolean;
};

export type GetPastFoodsResponse = {
  items: PastFoodEntry[];
};
