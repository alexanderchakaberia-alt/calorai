"use client";

import React, { useMemo, useState } from "react";
import { CameraInput } from "@/app/components/CameraInput";

type MealFormValues = {
  food_name: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  portion: string;
};

export function MealForm({
  onAddMeal,
  disabled,
  isAnalyzing,
  onImageSelected,
  onAnalyze,
}: {
  onAddMeal: (meal: {
    food_name: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    portion?: string;
  }) => Promise<void>;
  disabled?: boolean;
  isAnalyzing?: boolean;
  onImageSelected?: (imageBase64: string | null) => void;
  onAnalyze?: (imageBase64: string) => Promise<
    | void
    | {
        food_name?: string;
        calories?: number;
        protein?: number;
        fat?: number;
        carbs?: number;
        portion?: string;
      }
  >;
}) {
  const [values, setValues] = useState<MealFormValues>({
    food_name: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    portion: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (disabled || submitting || isAnalyzing) return false;
    if (!values.food_name.trim()) return false;
    if (values.calories.trim() === "") return false;
    const cal = Number(values.calories);
    if (!Number.isFinite(cal) || cal < 0) return false;
    for (const k of ["protein", "fat", "carbs"] as const) {
      if (values[k].trim() === "") continue;
      const n = Number(values[k]);
      if (!Number.isFinite(n) || n < 0) return false;
    }
    return true;
  }, [disabled, submitting, isAnalyzing, values]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const food_name = values.food_name.trim();
    const calories = Number(values.calories);
    const protein = values.protein.trim() === "" ? 0 : Number(values.protein);
    const fat = values.fat.trim() === "" ? 0 : Number(values.fat);
    const carbs = values.carbs.trim() === "" ? 0 : Number(values.carbs);

    if (!food_name) return setError("Meal name is required.");
    if (!Number.isFinite(calories) || calories < 0) return setError("Calories must be a non-negative number.");
    if (!Number.isFinite(protein) || protein < 0) return setError("Protein must be a non-negative number.");
    if (!Number.isFinite(fat) || fat < 0) return setError("Fat must be a non-negative number.");
    if (!Number.isFinite(carbs) || carbs < 0) return setError("Carbs must be a non-negative number.");

    setSubmitting(true);
    try {
      await onAddMeal({
        food_name,
        calories,
        protein,
        fat,
        carbs,
        portion: values.portion.trim() ? values.portion.trim() : undefined,
      });
      setValues({
        food_name: "",
        calories: "",
        protein: "",
        fat: "",
        carbs: "",
        portion: "",
      });
      setImageBase64(null);
      onImageSelected?.(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add meal. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl bg-white/90 shadow-sm ring-1 ring-black/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Log a meal</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manually add calories and macros for today.</p>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <CameraInput
          disabled={disabled || submitting}
          isAnalyzing={isAnalyzing}
          onImageCapture={(b64) => {
            setAnalyzeError(null);
            setImageBase64(b64);
            onImageSelected?.(b64);
          }}
          onAnalyze={async (b64) => {
            setAnalyzeError(null);
            if (!onAnalyze) {
              // Phase 2 wiring lives in the page; for now this is safe fallback.
              // eslint-disable-next-line no-console
              console.log("Ready for AI analysis:", b64);
              return;
            }

            const result = await onAnalyze(b64);
            if (!result) return;

            setValues((v) => ({
              ...v,
              food_name: result.food_name ?? v.food_name,
              calories: result.calories !== undefined ? String(result.calories) : v.calories,
              protein: result.protein !== undefined ? String(result.protein) : v.protein,
              fat: result.fat !== undefined ? String(result.fat) : v.fat,
              carbs: result.carbs !== undefined ? String(result.carbs) : v.carbs,
              portion: result.portion ?? v.portion,
            }));
          }}
        />

        {analyzeError ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {analyzeError}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Meal name</label>
          <input
            value={values.food_name}
            onChange={(e) => setValues((v) => ({ ...v, food_name: e.target.value }))}
            placeholder="e.g., Grilled Chicken Bowl"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
            disabled={disabled || submitting}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Calories</label>
            <input
              inputMode="numeric"
              value={values.calories}
              onChange={(e) => setValues((v) => ({ ...v, calories: e.target.value }))}
              placeholder="350"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
              disabled={disabled || submitting}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Protein (g)</label>
            <input
              inputMode="decimal"
              value={values.protein}
              onChange={(e) => setValues((v) => ({ ...v, protein: e.target.value }))}
              placeholder="40"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100"
              disabled={disabled || submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Fat (g)</label>
            <input
              inputMode="decimal"
              value={values.fat}
              onChange={(e) => setValues((v) => ({ ...v, fat: e.target.value }))}
              placeholder="15"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              disabled={disabled || submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Carbs (g)</label>
            <input
              inputMode="decimal"
              value={values.carbs}
              onChange={(e) => setValues((v) => ({ ...v, carbs: e.target.value }))}
              placeholder="5"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-green-300 focus:ring-4 focus:ring-green-100"
              disabled={disabled || submitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Portion size (optional)</label>
          <input
            value={values.portion}
            onChange={(e) => setValues((v) => ({ ...v, portion: e.target.value }))}
            placeholder="e.g., 1 bowl, 250g, 2 slices"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            disabled={disabled || submitting}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Adding..." : isAnalyzing ? "Analyzing..." : "Add meal"}
        </button>
      </form>
    </section>
  );
}

