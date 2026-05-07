"use client";

import CameraCapture from "@/components/CameraCapture";
import GoalsCalculator, { CALORAI_GOALS_LS_KEY } from "@/components/GoalsCalculator";
import { FoodLibrary } from "@/app/components/FoodLibrary";
import { MacroRing } from "@/app/components/MacroRing";
import { MealList } from "@/app/components/MealList";
import type { DailyGoals, MacroTotals, MealEntry } from "@/lib/types";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyTotals: MacroTotals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

function SetGoalsPrompt({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  return (
    <div className="calorai-enter rounded-2xl border border-dashed border-calorai-primary/35 bg-white p-8 text-center shadow-card">
      <p className="text-lg font-bold text-[#1C1C1E]">Set your daily goals</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#636366]">
        Add calorie and macro targets so your progress rings stay accurate.
      </p>
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="mt-6 rounded-xl bg-calorai-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        Set goals
      </button>
    </div>
  );
}

export function CalorieTracker() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [date, setDate] = useState(todayISO);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<MacroTotals>(emptyTotals);
  const [goals, setGoals] = useState<DailyGoals | null>(null);
  const [loading, setLoading] = useState(false);
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const canQuery = isLoaded && !!userId;

  const fetchOpts = useMemo(
    () =>
      ({
        credentials: "include" as const,
        headers: { Accept: "application/json" },
      }) satisfies RequestInit,
    []
  );

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setMeals([]);
      setTotals(emptyTotals);
      setGoals(null);
      return;
    }

    setLoading(true);
    try {
      const [mealsRes, goalsRes] = await Promise.all([
        fetch(`/api/meals?date=${encodeURIComponent(date)}`, fetchOpts),
        fetch("/api/goals", fetchOpts),
      ]);

      if (mealsRes.ok) {
        const mealsJson = (await mealsRes.json()) as { meals?: MealEntry[]; totals?: MacroTotals };
        setMeals(mealsJson.meals ?? []);
        setTotals(mealsJson.totals ?? emptyTotals);
        setLibraryRefresh((k) => k + 1);
      }

      if (goalsRes.ok) {
        const goalsJson = (await goalsRes.json()) as { goals?: DailyGoals };
        setGoals(goalsJson.goals ?? null);
      }
    } catch {
      /* offline / network: leave existing dashboard state */
    } finally {
      setLoading(false);
    }
  }, [date, fetchOpts, userId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !canQuery) return;
    try {
      if (localStorage.getItem(CALORAI_GOALS_LS_KEY) !== "1") {
        setGoalsModalOpen(true);
      }
    } catch {
      /* private mode */
    }
  }, [hydrated, canQuery]);

  async function deleteMeal(id: string) {
    const res = await fetch(`/api/meals/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) await loadDashboard();
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#636366]" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-calorai-bg">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-calorai-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="text-xl font-bold tracking-tight text-[#1C1C1E]">CalorAI</span>
          <div className="flex items-center gap-2">
            <UserButton />
            <SignOutButton>
              <button
                type="button"
                className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-calorai-bg active:scale-95"
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="calorai-enter mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="tracker-date" className="block text-xs font-semibold uppercase tracking-wide text-[#636366]">
              Date
            </label>
            <input
              id="tracker-date"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 rounded-xl border border-black/[0.08] bg-white px-4 py-2.5 text-[#1C1C1E] shadow-sm outline-none ring-calorai-primary transition focus:ring-2 focus:ring-calorai-primary/30"
            />
          </div>
          {loading ? (
            <span className="text-sm text-[#636366]" aria-live="polite">
              Syncing…
            </span>
          ) : null}
        </div>

        {goalsModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-dialog-title"
            onClick={() => setGoalsModalOpen(false)}
          >
            <div
              className="my-4 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl sm:my-8 sm:max-h-[min(90vh,880px)] sm:overflow-y-auto sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <GoalsCalculator
                isModal
                onDismiss={() => setGoalsModalOpen(false)}
                onSuccess={() => {
                  setGoalsModalOpen(false);
                  void loadDashboard();
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            {goals ? (
              <MacroRing goals={goals} totals={totals} onSetGoals={() => setGoalsModalOpen(true)} />
            ) : (
              <SetGoalsPrompt onOpen={() => setGoalsModalOpen(true)} busy={loading} />
            )}

            <section className="calorai-enter calorai-enter-delay-1 overflow-hidden rounded-2xl bg-white shadow-card">
              <div className="flex items-center gap-4 border-b border-black/[0.06] p-4 sm:p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-calorai-primary/12">
                  <svg className="h-7 w-7 text-calorai-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1C1C1E]">Food recognition</h2>
                  <p className="mt-0.5 text-sm text-[#636366]">Scan your meal</p>
                </div>
              </div>
              <div className="min-h-[200px] p-2 sm:p-4">
                <CameraCapture
                  key={userId}
                  logDate={date}
                  calorieGoal={goals?.calorie_goal ?? 2000}
                  dayCaloriesBeforeMeal={totals.calories}
                  onMealLogged={() => void loadDashboard()}
                />
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <MealList meals={meals} onDeleteMeal={deleteMeal} disabled={loading} />
            <FoodLibrary
              userId={userId}
              refreshKey={libraryRefresh}
              logDate={date}
              onMealLogged={() => void loadDashboard()}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
