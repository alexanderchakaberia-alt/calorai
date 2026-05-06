"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MacroRing } from "@/app/components/MacroRing";
import CameraCapture from "@/components/CameraCapture";
import { MealForm } from "@/app/components/MealForm";
import { MealList } from "@/app/components/MealList";
import type { DailyGoals, GetGoalsResponse, GetMealsResponse, ISODateString, MealEntry, MacroTotals } from "@/lib/types";

function getLocalISODate(d = new Date()): ISODateString {
  // en-CA yields YYYY-MM-DD in local time
  const s = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return s as ISODateString;
}

function formatHeaderDate(date: ISODateString) {
  const [y, m, dd] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, dd ?? 1);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    dt
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status}).`;
    throw new Error(msg);
  }
  return data as T;
}

export default function Page() {
  const date = useMemo(() => getLocalISODate(), []);

  const [goals, setGoals] = useState<DailyGoals | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState<MacroTotals>({ calories: 0, protein: 0, fat: 0, carbs: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [g, m] = await Promise.all([
        fetchJson<GetGoalsResponse>(`/api/goals?date=${encodeURIComponent(date)}`),
        fetchJson<GetMealsResponse>(`/api/meals?date=${encodeURIComponent(date)}`),
      ]);
      setGoals(g.goals);
      setMeals(m.meals);
      setTotals(m.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const refresh = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const m = await fetchJson<GetMealsResponse>(`/api/meals?date=${encodeURIComponent(date)}`);
      setMeals(m.meals);
      setTotals(m.totals);
      if (!goals) {
        const g = await fetchJson<GetGoalsResponse>(`/api/goals?date=${encodeURIComponent(date)}`);
        setGoals(g.goals);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh.");
    } finally {
      setRefreshing(false);
    }
  }, [date, goals]);

  useEffect(() => {
    void load();
  }, [load]);

  const headerDate = useMemo(() => formatHeaderDate(date), [date]);

  const busy = loading || refreshing;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">
              Demo mode
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Nutrition Tracker</h1>
            <p className="mt-1 text-sm text-slate-600">{headerDate}</p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        ) : null}

        <section className="mt-5 sm:mt-6">
          {loading || !goals ? (
            <div className="rounded-xl bg-white/90 p-5 ring-1 ring-black/5 shadow-sm">
              <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[220px] animate-pulse rounded-xl bg-slate-100 ring-1 ring-black/5" />
                ))}
              </div>
            </div>
          ) : (
            <MacroRing goals={goals} totals={totals} />
          )}
        </section>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-5">
          <CameraCapture onMealLogged={refresh} />
          <MealForm
            disabled={busy}
            onAddMeal={async (meal) => {
              await fetchJson(`/api/meals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, ...meal }),
              });
              await refresh();
            }}
          />

          <MealList
            meals={meals}
            disabled={busy}
            onDeleteMeal={async (id) => {
              await fetchJson(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" });
              await refresh();
            }}
          />
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Data is stored locally in SQLite (<span className="font-medium text-slate-600">db.sqlite</span>).
        </footer>
      </div>
    </main>
  );
}

