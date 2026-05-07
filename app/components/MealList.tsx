"use client";

import React, { useState } from "react";
import type { MealEntry } from "@/lib/types";

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function formatMealTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function EmptyMealsIllustration() {
  return (
    <div className="flex flex-col items-center py-8" aria-hidden>
      <svg width="120" height="100" viewBox="0 0 120 100" className="text-calorai-primary/30">
        <ellipse cx="60" cy="88" rx="40" ry="6" fill="currentColor" opacity="0.15" />
        <circle cx="60" cy="48" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M42 48h36M60 30v36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <circle cx="60" cy="48" r="4" fill="currentColor" opacity="0.4" />
      </svg>
      <p className="mt-4 text-center text-sm font-semibold text-[#1C1C1E]">No meals yet</p>
      <p className="mt-1 max-w-xs text-center text-sm text-[#636366]">Scan a meal or add something from your library below.</p>
    </div>
  );
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

  const runningCalories = meals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);

  async function handleDelete(id: string) {
    if (disabled) return;
    setDeletingId(id);
    try {
      await onDeleteMeal(id);
    } catch {
      /* graceful: list refreshes on next load */
    } finally {
      setDeletingId((cur) => (cur === id ? null : cur));
    }
  }

  return (
    <section className="calorai-enter calorai-enter-delay-1 rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#1C1C1E]">Today&apos;s meals</h2>
          <p className="mt-1 text-sm text-[#636366]">
            <span className="font-semibold tabular-nums text-[#1C1C1E]">{Math.round(runningCalories)} kcal</span>
            <span className="text-[#C7C7CC]"> · </span>
            {meals.length} {meals.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {meals.length === 0 ? (
        <EmptyMealsIllustration />
      ) : (
        <ul className="mt-3 space-y-2">
          {meals.map((m, i) => (
            <li
              key={m.id}
              className="calorai-enter flex items-center gap-3 rounded-xl border border-black/[0.06] bg-calorai-bg/50 px-3 py-3 transition hover:shadow-card-hover active:scale-[0.99]"
              style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#1C1C1E]">{m.food_name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#636366]">
                  <span>{formatMealTime(m.logged_at)}</span>
                  <span className="font-semibold text-calorai-primary tabular-nums">{fmt(m.calories)} kcal</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(m.id)}
                disabled={disabled || deletingId === m.id}
                className="flex h-10 min-w-[2.5rem] shrink-0 items-center justify-center rounded-xl text-[#636366] transition hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-40"
                aria-label="Delete meal"
              >
                {deletingId === m.id ? (
                  <span className="h-4 w-4 animate-pulse rounded-full bg-calorai-primary/30" />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
