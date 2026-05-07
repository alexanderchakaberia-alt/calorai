"use client";

import type { PastFoodEntry } from "@/lib/types";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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

function matches(q: string, name: string) {
  if (!q.trim()) return true;
  return name.toLowerCase().includes(q.trim().toLowerCase());
}

function fmtMacro(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="h-5 w-5 text-amber-400 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-[#C7C7CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function LibraryFoodCard({
  name,
  calories,
  protein,
  fat,
  carbs,
  portion,
  useLabel,
  busy,
  showStar,
  starred,
  starBusy,
  onFavorite,
  onAdd,
}: {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion: string | null;
  useLabel?: string;
  busy: boolean;
  showStar: boolean;
  starred?: boolean;
  starBusy?: boolean;
  onFavorite?: () => void;
  onAdd: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="inline-flex w-[min(260px,85vw)] shrink-0 snap-start flex-col rounded-2xl border border-black/[0.06] bg-calorai-bg shadow-sm transition hover:shadow-card-hover">
      <div className="flex min-h-[52px] items-stretch">
        {showStar ? (
          <button
            type="button"
            title={starred ? "Remove from favorites" : "Add to favorites"}
            disabled={starBusy || !onFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className="flex shrink-0 items-center justify-center px-3 transition hover:bg-black/[0.04] disabled:opacity-50"
            aria-label={starred ? "Remove favorite" : "Add favorite"}
          >
            {starBusy ? <span className="text-xs text-[#636366]">…</span> : <StarIcon filled={!!starred} />}
          </button>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void onAdd()}
          className="min-h-[48px] min-w-0 flex-1 px-2 py-3 text-left transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-50"
        >
          <div className="truncate text-sm font-semibold text-[#1C1C1E]">{name}</div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-[#636366]">
            <span className="font-semibold tabular-nums text-calorai-primary">{Math.round(calories)} kcal</span>
            {useLabel ? <span>{useLabel}</span> : null}
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="flex shrink-0 items-center px-2 text-[#636366] transition hover:text-[#1C1C1E]"
          aria-expanded={expanded}
          aria-label={expanded ? "Hide nutrition" : "Show nutrition"}
        >
          <svg
            className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded ? (
        <div className="calorai-enter border-t border-black/[0.06] bg-white px-3 py-2.5 text-xs">
          {portion ? (
            <p className="mb-2 text-[#636366]">
              <span className="font-medium text-[#1C1C1E]">Portion:</span> {portion}
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Protein</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(protein)} g</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Fat</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(fat)} g</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Carbs</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(carbs)} g</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FoodLibrary({
  userId,
  refreshKey,
  onMealLogged,
  logDate,
}: {
  userId: string;
  refreshKey: number;
  onMealLogged?: () => void;
  logDate?: string;
}) {
  const effectiveDate = logDate ?? todayISO();
  const [items, setItems] = useState<PastFoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [starringId, setStarringId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/past-foods", { credentials: "include", headers: { Accept: "application/json" } });
      const j = (await res.json().catch(() => ({}))) as { items?: PastFoodEntry[] };
      if (res.ok) setItems(j.items ?? []);
      else setItems([]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function logQuick(food: QuickFood | PastFoodEntry, dedupeKey: string) {
    setLoggingKey(dedupeKey);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          date: effectiveDate,
          food_name: food.food_name,
          portion: food.portion ?? undefined,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
        }),
      });
      if (res.ok) {
        setToast(`Added ${food.food_name}`);
        onMealLogged?.();
        await load();
      }
    } catch {
      /* silent */
    } finally {
      setLoggingKey(null);
    }
  }

  async function toggleFavorite(entry: PastFoodEntry) {
    setStarringId(entry.id);
    try {
      const res = await fetch(`/api/past-foods/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: !entry.favorited }),
      });
      if (res.ok) await load();
    } catch {
      /* silent */
    } finally {
      setStarringId(null);
    }
  }

  const favorites = useMemo(() => {
    const list = items.filter((i) => i.favorited && matches(query, i.food_name));
    list.sort((a, b) => b.use_count - a.use_count);
    return list;
  }, [items, query]);

  const recent = useMemo(() => {
    const list = items.filter((i) => !i.favorited && matches(query, i.food_name));
    list.sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());
    return list.slice(0, 10);
  }, [items, query]);

  const commonFiltered = useMemo(() => COMMON_FOODS.filter((c) => matches(query, c.food_name)), [query]);

  const showNoResults =
    !loading && query.trim() !== "" && favorites.length === 0 && recent.length === 0 && commonFiltered.length === 0;

  return (
    <section className="relative calorai-enter calorai-enter-delay-2 rounded-2xl bg-white p-4 shadow-card sm:p-5">
      {toast ? (
        <div
          className="calorai-enter fixed bottom-6 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-2xl border border-calorai-success/25 bg-[#1C1C1E] px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1C1C1E]">Food library</h2>
        <p className="mt-0.5 text-sm text-[#636366]">From your history — tap a food to log it for the selected date</p>
      </div>

      <div className="relative mb-5">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C7C7CC]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search favorites, recent & common…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-black/[0.06] bg-calorai-bg py-3 pl-11 pr-4 text-sm text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none ring-calorai-primary transition focus:bg-white focus:ring-2 focus:ring-calorai-primary/30"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-[#636366]">Loading library…</p>
      ) : showNoResults ? (
        <div className="rounded-xl border border-dashed border-black/[0.1] bg-calorai-bg py-10 text-center">
          <p className="text-sm font-semibold text-[#1C1C1E]">No results</p>
          <p className="mt-1 text-sm text-[#636366]">Try a different search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Favorites" horizontal>
            {favorites.length === 0 ? (
              <p className="w-full py-3 text-sm text-[#636366]">Star foods from Recent to pin them here.</p>
            ) : (
              favorites.map((f) => (
                <LibraryFoodCard
                  key={f.id}
                  name={f.food_name}
                  calories={f.calories}
                  protein={f.protein}
                  fat={f.fat}
                  carbs={f.carbs}
                  portion={f.portion}
                  useLabel={`×${f.use_count}`}
                  busy={loggingKey === f.id}
                  showStar
                  starred={f.favorited}
                  starBusy={starringId === f.id}
                  onFavorite={() => void toggleFavorite(f)}
                  onAdd={() => void logQuick(f, f.id)}
                />
              ))
            )}
          </Section>

          <Section title="Recent" horizontal>
            {recent.length === 0 ? (
              <p className="w-full py-3 text-sm text-[#636366]">
                Foods you log with the camera or from Common appear here (last 10).
              </p>
            ) : (
              recent.map((f) => (
                <LibraryFoodCard
                  key={f.id}
                  name={f.food_name}
                  calories={f.calories}
                  protein={f.protein}
                  fat={f.fat}
                  carbs={f.carbs}
                  portion={f.portion}
                  useLabel={`×${f.use_count}`}
                  busy={loggingKey === f.id}
                  showStar
                  starred={f.favorited}
                  starBusy={starringId === f.id}
                  onFavorite={() => void toggleFavorite(f)}
                  onAdd={() => void logQuick(f, f.id)}
                />
              ))
            )}
          </Section>

          <Section title="Common" horizontal>
            {commonFiltered.length === 0 ? (
              <p className="w-full py-3 text-sm text-[#636366]">No matches in this section.</p>
            ) : (
              commonFiltered.map((c) => (
                <LibraryFoodCard
                  key={c.food_name}
                  name={c.food_name}
                  calories={c.calories}
                  protein={c.protein}
                  fat={c.fat}
                  carbs={c.carbs}
                  portion={c.portion}
                  busy={loggingKey === `common:${c.food_name}`}
                  showStar={false}
                  onAdd={() => void logQuick(c, `common:${c.food_name}`)}
                />
              ))
            )}
          </Section>
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  children,
  horizontal,
}: {
  title: string;
  children: React.ReactNode;
  horizontal?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#636366]">{title}</h3>
      <div
        className={
          horizontal
            ? "flex gap-2 overflow-x-auto scroll-smooth pb-1 [-webkit-overflow-scrolling:touch]"
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
