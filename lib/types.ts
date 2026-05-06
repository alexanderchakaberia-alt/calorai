export const DEMO_USER_ID = "demo-user-1" as const;

export type ISODateString = `${number}-${number}-${number}`; // YYYY-MM-DD (local)

export type MacroTotals = {
  calories: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
};

export type DailyGoals = {
  id: string;
  user_id: string;
  date: ISODateString;
  calorie_goal: number;
  protein_goal: number;
  fat_goal: number;
  carbs_goal: number;
  created_at: string; // ISO datetime
};

export type MealEntry = {
  id: string;
  user_id: string;
  date: ISODateString;
  meal_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion_size: string | null;
  image_path: string | null;
  created_at: string; // ISO datetime
};

export type GetMealsResponse = {
  date: ISODateString;
  meals: MealEntry[];
  totals: MacroTotals;
};

export type GetGoalsResponse = {
  date: ISODateString;
  goals: DailyGoals;
};

export type ApiErrorResponse = {
  error: string;
};

export type CreateMealRequest = {
  date: ISODateString;
  meal_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion_size?: string;
};

export type UpdateGoalsRequest = {
  date: ISODateString;
  calorie_goal?: number;
  protein_goal?: number;
  fat_goal?: number;
  carbs_goal?: number;
};

