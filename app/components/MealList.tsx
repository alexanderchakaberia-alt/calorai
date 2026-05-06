"use client";

import React, { useState } from "react";
import type { MealEntry } from "@/lib/types";

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export function MealList({
  meals,
  onDeleteMeal,
  disabled,
}: {
  meals: MealEntry[];
  onDeleteMeal: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (disabled) return;
    setError(null);
    setDeletingId(id);
    try {
      await onDeleteMeal(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete meal. Please try again.";
      setError(msg);
    } finally {
      setDeletingId((cur) => (cur === id ? null : cur));
    }
  }

  return (
    <section className="rounded-xl bg-white/90 shadow-sm ring-1 ring-black/5 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Today’s meals</h2>
          <p className="mt-0.5 text-sm text-slate-500">Your logged entries for the selected date.</p>
        </div>
        <div className="text-xs font-medium text-slate-600">{meals.length} total</div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {meals.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
          <div className="text-sm font-semibold text-slate-800">No meals logged yet</div>
          <div className="mt-1 text-sm text-slate-500">Add your first meal above to see progress.</div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {meals.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-slate-900">{m.food_name}</div>
                    {m.portion ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {m.portion}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-semibold text-purple-700">{fmt(m.calories)} kcal</span>
                    <span className="text-red-700">P {fmt(m.protein)}g</span>
                    <span className="text-orange-700">F {fmt(m.fat)}g</span>
                    <span className="text-green-700">C {fmt(m.carbs)}g</span>
                  </div>
                </div>

                <button
                  onClick={() => void handleDelete(m.id)}
                  disabled={disabled || deletingId === m.id}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === m.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

