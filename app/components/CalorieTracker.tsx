"use client";

import CameraCapture from "@/components/CameraCapture";
import { DailyHistory } from "@/components/DailyHistory";
import GoalsCalculator, { CALORAI_GOALS_LS_KEY } from "@/components/GoalsCalculator";
import { FoodLibrary } from "@/app/components/FoodLibrary";
import { MacroRing } from "@/app/components/MacroRing";
import { MealList } from "@/app/components/MealList";
import type { DailyGoals, MacroTotals, MealEntry } from "@/lib/types";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyTotals: MacroTotals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

function SetGoalsPrompt({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  return (
    <div className="calorai-enter rounded-[var(--calorai-radius-card)] border border-dashed border-calorai-primary/35 bg-white p-8 text-center shadow-[var(--calorai-shadow-sm)]">
      <p className="text-lg font-bold text-[var(--calorai-text)]">Set your daily goals</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--calorai-text-secondary)]">
        Add calorie and macro targets so your progress rings stay accurate.
      </p>
      <button type="button" onClick={onOpen} disabled={busy} className="btn-primary mt-6 text-sm">
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
  const viewingTodayRef = useRef(true);

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

  useEffect(() => {
    viewingTodayRef.current = date === todayISO();
  }, [date]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const today = todayISO();
      if (!viewingTodayRef.current) return;
      setDate((prev) => (prev !== today ? today : prev));
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

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
    <div className="min-h-screen bg-calorai-bg pb-16">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#007AFF] to-[#0051D5] text-white shadow-[var(--calorai-shadow-md)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="text-xl font-bold tracking-tight">CalorAI</span>
          <div className="flex items-center gap-2 [&_.cl-userButton-trigger]:rounded-full [&_.cl-userButton-trigger]:ring-2 [&_.cl-userButton-trigger]:ring-white/30">
            <UserButton
              appearance={{
                elements: { userButtonPopoverCard: "border border-black/[0.08] shadow-[var(--calorai-shadow-lg)]", avatarBox: "h-10 w-10" },
              }}
            />
            <SignOutButton>
              <button
                type="button"
                className="btn-secondary rounded-[var(--calorai-radius-btn)] border border-white/55 bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-none backdrop-blur-sm hover:border-white hover:bg-white/25 hover:!scale-[1.02] hover:!shadow-sm active:!scale-[0.98]"
              >
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="calorai-enter mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="tracker-date" className="block text-xs font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">
              Date
            </label>
            <input
              id="tracker-date"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => {
                const v = e.target.value;
                setDate(v);
                viewingTodayRef.current = v === todayISO();
              }}
              className="cal-input mt-1.5 w-full max-w-[220px]"
            />
          </div>
          {loading ? (
            <span className="text-sm text-[var(--calorai-text-secondary)]" aria-live="polite">
              Syncing…
            </span>
          ) : null}
        </div>

        {goalsModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex animate-[calorai-modal-fadeIn_0.3s_ease-in-out_both] items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-dialog-title"
            onClick={() => setGoalsModalOpen(false)}
          >
            <div
              className="my-4 w-full max-w-2xl rounded-[var(--calorai-radius-modal)] bg-white p-5 shadow-[var(--calorai-shadow-lg)] animate-[calorai-modal-scaleIn_0.3s_ease-out_both] sm:my-8 sm:max-h-[min(90vh,880px)] sm:overflow-y-auto sm:p-6"
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

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="flex flex-col gap-6">
            {goals ? (
              <MacroRing goals={goals} totals={totals} onSetGoals={() => setGoalsModalOpen(true)} />
            ) : (
              <SetGoalsPrompt onOpen={() => setGoalsModalOpen(true)} busy={loading} />
            )}

            <section className="calorai-enter calorai-enter-delay-1 overflow-hidden rounded-[var(--calorai-radius-card)] border border-[var(--calorai-border)] bg-white shadow-[var(--calorai-shadow-sm)]">
              <div className="flex items-center gap-4 border-b border-[var(--calorai-border)] p-4 sm:p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--calorai-radius-card)] bg-calorai-primary/12">
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
                  <h2 className="text-base font-bold text-[var(--calorai-text)]">Food recognition</h2>
                  <p className="mt-0.5 text-sm text-[var(--calorai-text-secondary)]">Scan your meal</p>
                </div>
              </div>
              <div className="h-[360px] min-h-[360px] p-2 sm:h-[420px] sm:min-h-[420px] sm:p-4">
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
            <div>
              <MealList meals={meals} goals={goals} onDeleteMeal={deleteMeal} disabled={loading} />
            </div>
            <div className="">
              <FoodLibrary
                userId={userId}
                refreshKey={libraryRefresh}
                logDate={date}
                onMealLogged={() => void loadDashboard()}
              />
            </div>
          </div>
        </div>

        <DailyHistory
          refreshKey={libraryRefresh}
          calorieGoal={Math.max(1, Number(goals?.calorie_goal) || 2000)}
          onSelectDay={(iso) => {
            setDate(iso);
            viewingTodayRef.current = iso === todayISO();
          }}
        />
      </main>
    </div>
  );
}
