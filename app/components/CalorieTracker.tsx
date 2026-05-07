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

export function CalorieTracker({ displayName }: { displayName: string }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [date, setDate] = useState(todayISO);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<MacroTotals>(emptyTotals);
  const [goals, setGoals] = useState<DailyGoals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [mealsRes, goalsRes] = await Promise.all([
        fetch(`/api/meals?date=${encodeURIComponent(date)}`, fetchOpts),
        fetch("/api/goals", fetchOpts),
      ]);

      if (!mealsRes.ok) {
        const j = (await mealsRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || "Could not load meals.");
      }
      if (!goalsRes.ok) {
        const j = (await goalsRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j?.error || "Could not load goals.");
      }

      const mealsJson = (await mealsRes.json()) as { meals?: MealEntry[]; totals?: MacroTotals };
      const goalsJson = (await goalsRes.json()) as { goals?: DailyGoals };

      setMeals(mealsJson.meals ?? []);
      setTotals(mealsJson.totals ?? emptyTotals);
      setGoals(goalsJson.goals ?? null);
      setLibraryRefresh((k) => k + 1);
    } catch (e) {
      setMeals([]);
      setTotals(emptyTotals);
      setGoals(null);
      setLoadError(e instanceof Error ? e.message : "Failed to load dashboard.");
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
      /* private mode / no storage */
    }
  }, [hydrated, canQuery]);

  async function deleteMeal(id: string) {
    const res = await fetch(`/api/meals/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(j?.error || "Delete failed.");
    await loadDashboard();
  }

  if (!isLoaded) {
    return (
      <p className="px-4 py-12 text-center text-sm text-slate-500" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Calorie Tracker</h1>
          <p className="mt-0.5 truncate text-sm text-slate-600">{displayName}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setGoalsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            aria-label="Set daily goals"
          >
            <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Set goals</span>
          </button>
          <UserButton />
          <SignOutButton>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>

      {goalsModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goals-dialog-title"
          onClick={() => setGoalsModalOpen(false)}
        >
          <div
            className="my-4 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:my-8 sm:max-h-[min(90vh,880px)] sm:overflow-y-auto sm:p-6"
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

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="tracker-date" className="block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="tracker-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
        {loading ? (
          <div className="text-sm text-slate-500" aria-live="polite">
            Syncing…
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
          {loadError}
        </div>
      ) : null}

      {goals ? (
        <section className="mb-8 rounded-2xl bg-slate-100/80 p-4 ring-1 ring-slate-200/60 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Daily progress</h2>
          <MacroRing goals={goals} totals={totals} />
        </section>
      ) : !loadError ? (
        <p className="mb-6 text-sm text-slate-600">Loading your targets…</p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="mb-3 px-3 pt-3 text-sm font-semibold text-slate-800">Food recognition</h2>
          <CameraCapture
            key={userId}
            logDate={date}
            calorieGoal={goals?.calorie_goal ?? 2000}
            dayCaloriesBeforeMeal={totals.calories}
            onMealLogged={() => void loadDashboard()}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Today&apos;s meals</h2>
          <MealList meals={meals} onDeleteMeal={deleteMeal} disabled={loading} />
        </section>
      </div>

      <div className="mt-8">
        <FoodLibrary userId={userId} refreshKey={libraryRefresh} onMealLogged={() => void loadDashboard()} />
      </div>
    </div>
  );
}
