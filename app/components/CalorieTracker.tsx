"use client";

import CameraCapture from "@/components/CameraCapture";
import { MacroRing } from "@/app/components/MacroRing";
import { MealList } from "@/app/components/MealList";
import type { DailyGoals, MacroTotals, MealEntry } from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyTotals: MacroTotals = { calories: 0, protein: 0, fat: 0, carbs: 0 };

export function CalorieTracker() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? null;

  const [date, setDate] = useState(todayISO);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<MacroTotals>(emptyTotals);
  const [goals, setGoals] = useState<DailyGoals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <p className="text-center text-sm text-slate-500" style={{ padding: 24 }}>
        Loading…
      </p>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm"
          />
        </div>
        {loading ? <div className="text-sm text-slate-500">Syncing…</div> : null}
      </div>

      {loadError ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{loadError}</div>
      ) : null}

      {goals ? (
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Progress</h2>
          <MacroRing goals={goals} totals={totals} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <CameraCapture key={userId} onMealLogged={() => void loadDashboard()} />
        <MealList meals={meals} onDeleteMeal={deleteMeal} disabled={loading} />
      </div>
    </div>
  );
}
