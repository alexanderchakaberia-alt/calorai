"use client";

import type { PastFoodEntry } from "@/lib/types";
import React, { useCallback, useEffect, useState } from "react";

type QuickFood = {
  food_name: string;
  portion: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const COMMON_FOODS: QuickFood[] = [
  { food_name: "Banana", portion: "1 medium", calories: 105, protein: 1.3, fat: 0.4, carbs: 27 },
  { food_name: "Egg (large)", portion: "1 egg", calories: 78, protein: 6, fat: 5, carbs: 0.6 },
  { food_name: "Greek yogurt", portion: "170g", calories: 100, protein: 17, fat: 0.7, carbs: 6 },
  { food_name: "Chicken breast", portion: "100g", calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  { food_name: "Oatmeal", portion: "1 cup cooked", calories: 158, protein: 6, fat: 3.2, carbs: 27 },
  { food_name: "Salmon", portion: "100g", calories: 208, protein: 20, fat: 13, carbs: 0 },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FoodLibrary({
  userId,
  refreshKey,
  onMealLogged,
}: {
  userId: string;
  refreshKey: number;
  onMealLogged?: () => void;
}) {
  const [items, setItems] = useState<PastFoodEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [starringId, setStarringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/past-foods", { credentials: "include", headers: { Accept: "application/json" } });
      const j = (await res.json().catch(() => ({}))) as { items?: PastFoodEntry[]; error?: string };
      if (!res.ok) throw new Error(j?.error || "Could not load food library.");
      setItems(j.items ?? []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function logQuick(food: QuickFood | PastFoodEntry, dedupeKey: string) {
    setLoggingKey(dedupeKey);
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          date: todayISO(),
          food_name: food.food_name,
          portion: food.portion ?? undefined,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j?.error || "Could not log meal.");
      await load();
      onMealLogged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Log failed.");
    } finally {
      setLoggingKey(null);
    }
  }

  async function toggleFavorite(entry: PastFoodEntry) {
    setStarringId(entry.id);
    setError(null);
    try {
      const res = await fetch(`/api/past-foods/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: !entry.favorited }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j?.error || "Could not update favorite.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Favorite failed.");
    } finally {
      setStarringId(null);
    }
  }

  const favorites = items.filter((i) => i.favorited);
  const recent = items.filter((i) => !i.favorited);

  return (
    <section className="rounded-xl bg-white/90 shadow-sm ring-1 ring-black/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Food Library</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tap to log today — favorites and your history.</p>
        </div>
        {loading ? <span className="text-xs text-slate-500">Loading…</span> : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      <div className="mt-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Favorites</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {favorites.length === 0 ? (
              <p className="text-sm text-slate-500">Star foods below to pin them here.</p>
            ) : (
              favorites.map((f) => (
                <FoodChip
                  key={f.id}
                  label={f.food_name}
                  sub={`${Math.round(f.calories)} kcal · ×${f.use_count}`}
                  busy={loggingKey === f.id}
                  onLog={() => void logQuick(f, f.id)}
                  star
                  starred={f.favorited}
                  starBusy={starringId === f.id}
                  onStar={() => void toggleFavorite(f)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Foods you log appear here (sorted by last used).</p>
            ) : (
              recent.map((f) => (
                <FoodChip
                  key={f.id}
                  label={f.food_name}
                  sub={`${Math.round(f.calories)} kcal · ×${f.use_count}`}
                  busy={loggingKey === f.id}
                  onLog={() => void logQuick(f, f.id)}
                  star
                  starred={f.favorited}
                  starBusy={starringId === f.id}
                  onStar={() => void toggleFavorite(f)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Common</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {COMMON_FOODS.map((c) => (
              <FoodChip
                key={c.food_name}
                label={c.food_name}
                sub={`${Math.round(c.calories)} kcal`}
                busy={loggingKey === `common:${c.food_name}`}
                onLog={() => void logQuick(c, `common:${c.food_name}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FoodChip({
  label,
  sub,
  onLog,
  busy,
  star,
  starred,
  onStar,
  starBusy,
}: {
  label: string;
  sub: string;
  onLog: () => void;
  busy: boolean;
  star?: boolean;
  starred?: boolean;
  onStar?: () => void;
  starBusy?: boolean;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white shadow-sm">
      {star ? (
        <button
          type="button"
          title={starred ? "Remove from favorites" : "Add to favorites"}
          disabled={starBusy}
          onClick={(e) => {
            e.stopPropagation();
            onStar?.();
          }}
          className="shrink-0 px-2 py-2 text-amber-500 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Favorite"
        >
          {starBusy ? "…" : starred ? "★" : "☆"}
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={onLog}
        className="min-w-0 flex-1 px-3 py-2 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="truncate text-sm font-semibold text-slate-900">{label}</div>
        <div className="truncate text-xs text-slate-500">{sub}</div>
      </button>
    </div>
  );
}
