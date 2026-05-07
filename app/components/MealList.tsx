"use client";

import React, { useState } from "react";
import type { DailyGoals, MealEntry } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function pctOfGoal(value: number, goal: number) {
  if (!goal || goal <= 0) return 0;
  return clamp((value / goal) * 100, 0, 100);
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
    <div className="flex flex-col items-center py-10" aria-hidden>
      <svg width="120" height="100" viewBox="0 0 120 100" className="text-calorai-primary/25">
        <ellipse cx="60" cy="88" rx="40" ry="6" fill="currentColor" opacity="0.35" />
        <circle cx="60" cy="48" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M42 48h36M60 30v36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <circle cx="60" cy="48" r="4" fill="currentColor" opacity="0.5" />
      </svg>
      <p className="mt-4 text-center text-sm font-semibold text-[var(--calorai-text)]">Ready to track?</p>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-[var(--calorai-text-secondary)]">
        Tap the camera above to scan your first meal.
      </p>
    </div>
  );
}

export function MealList({
  meals,
  goals,
  onDeleteMeal,
  disabled,
}: {
  meals: MealEntry[];
  goals?: DailyGoals | null;
  onDeleteMeal: (id: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const runningCalories = meals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
  const animatedCalories = useAnimatedNumber(runningCalories, 500);

  async function handleDelete(id: string) {
    if (disabled) return;
    setDeletingId(id);
    try {
      await onDeleteMeal(id);
    } finally {
      setDeletingId((cur) => (cur === id ? null : cur));
    }
  }

  const pGoal = goals?.protein_goal ?? 0;
  const fGoal = goals?.fat_goal ?? 0;
  const cGoal = goals?.carbs_goal ?? 0;

  return (
    <section className="calorai-enter calorai-enter-delay-1 rounded-[var(--calorai-radius-card)] bg-white p-5 shadow-[var(--calorai-shadow-sm)] md:min-h-0 md:overflow-visible">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--calorai-border)] pb-4">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">
            Today&apos;s meals
          </h2>
          <p className="mt-1 text-sm text-[var(--calorai-text-secondary)]">
            <span className="text-lg font-bold tabular-nums text-[var(--calorai-text)]">{Math.round(animatedCalories)} kcal</span>
            <span className="text-[var(--calorai-border)]"> · </span>
            {meals.length} {meals.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {meals.length === 0 ? (
        <EmptyMealsIllustration />
      ) : (
        <ul className="mt-4 space-y-3">
          {meals.map((m, i) => {
            const p = Number(m.protein) || 0;
            const f = Number(m.fat) || 0;
            const c = Number(m.carbs) || 0;
            const wP = pGoal > 0 ? pctOfGoal(p, pGoal) : clamp((p / Math.max(p + f + c, 1e-9)) * 100, 0, 100);
            const wF = fGoal > 0 ? pctOfGoal(f, fGoal) : clamp((f / Math.max(p + f + c, 1e-9)) * 100, 0, 100);
            const wC = cGoal > 0 ? pctOfGoal(c, cGoal) : clamp((c / Math.max(p + f + c, 1e-9)) * 100, 0, 100);

            return (
              <li
                key={m.id}
                className="group calorai-enter cal-card cal-card-hover flex gap-4 px-4 py-4"
                style={{ animationDelay: `${Math.min(i, 12) * 0.05}s` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl font-semibold tracking-tight text-[var(--calorai-text)]">{m.food_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--calorai-text-secondary)]">
                    <span>{formatMealTime(m.logged_at)}</span>
                    <span aria-hidden>·</span>
                    <span className="font-semibold tabular-nums text-[var(--calorai-text)]">
                      {Math.round(Number(m.calories) || 0)} kcal
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                    <span className="text-[var(--calorai-text-secondary)]">
                      P <span className="font-semibold text-[var(--calorai-text)]">{fmt(p)}g</span>
                    </span>
                    <span className="text-[var(--calorai-text-secondary)]">
                      F <span className="font-semibold text-[var(--calorai-text)]">{fmt(f)}g</span>
                    </span>
                    <span className="text-[var(--calorai-text-secondary)]">
                      C <span className="font-semibold text-[var(--calorai-text)]">{fmt(c)}g</span>
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="cal-macro-fill h-full rounded-full bg-[var(--calorai-primary)]"
                        style={{ width: `${wP}%`, transitionDuration: "0.45s", transitionTimingFunction: "ease-out" }}
                      />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="cal-macro-fill h-full rounded-full bg-[var(--calorai-warning)]"
                        style={{ width: `${wF}%`, transitionDuration: "0.45s", transitionTimingFunction: "ease-out" }}
                      />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="cal-macro-fill h-full rounded-full bg-[var(--calorai-success)]"
                        style={{ width: `${wC}%`, transitionDuration: "0.45s", transitionTimingFunction: "ease-out" }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDelete(m.id)}
                  disabled={disabled || deletingId === m.id}
                  className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--calorai-radius-btn)] text-[var(--calorai-text-secondary)] opacity-100 transition hover:bg-[var(--calorai-bg)] hover:text-[var(--calorai-error)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Delete meal"
                >
                  {deletingId === m.id ? (
                    <span className="h-4 w-4 animate-pulse rounded-full bg-calorai-primary/30" />
                  ) : (
                    <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
