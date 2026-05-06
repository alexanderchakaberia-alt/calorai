export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001" as const;

export type ISODateString = `${number}-${number}-${number}`; // YYYY-MM-DD

export type MacroTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type DailyGoals = {
  id: string;
  user_id: string;
  calorie_goal: number;
  protein_goal: number;
  fat_goal: number;
  carbs_goal: number;
};

export type MealEntry = {
  id: string;
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
};
