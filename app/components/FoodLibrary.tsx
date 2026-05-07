"use client";

import type { FoodSearchResult, PastFoodEntry } from "@/lib/types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FOOD_CATEGORIES, FOOD_DATABASE, type FoodCategory, type FoodDbItem } from "@/lib/foodDatabase";
import FoodSelectionModal from "@/components/FoodSelectionModal";
import type { PortionFood } from "@/components/PortionSelector";

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

function categoryShort(c: FoodCategory): string {
  if (c === "Breads & Bakery") return "Breads";
  if (c === "Rice & Grains") return "Grains";
  if (c === "Meat & Poultry") return "Meat";
  if (c === "Fish & Seafood") return "Fish";
  if (c === "Eggs & Dairy") return "Dairy";
  if (c === "Legumes & Beans") return "Beans";
  if (c === "Nuts & Seeds") return "Nuts";
  if (c === "Fast Food & Prepared") return "Fast food";
  if (c === "Sauces & Condiments") return "Sauces";
  return c;
}

function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="rounded bg-calorai-primary/15 px-1 py-0.5 text-inherit">{mid}</mark>
      {after}
    </>
  );
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

type FoodCardModel = {
  key: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  portion: string;
  source: "local" | "past" | "usda" | "openfoodfacts";
  favorited: boolean;
  pastFoodId?: string;
  dbItem?: FoodDbItem;
  apiItem?: FoodSearchResult;
};

function LibraryFoodCard({
  model,
  query,
  starBusy,
  onFavorite,
  onOpen,
}: {
  model: FoodCardModel;
  query: string;
  starBusy: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-black/[0.06] bg-white shadow-sm transition hover:shadow-card-hover">
      <div className="flex min-h-[52px] items-stretch">
        <button
          type="button"
          title={model.favorited ? "Remove from favorites" : "Add to favorites"}
          disabled={starBusy}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="flex shrink-0 items-center justify-center px-3 transition hover:bg-black/[0.04] disabled:opacity-50"
          aria-label={model.favorited ? "Remove favorite" : "Add favorite"}
        >
          {starBusy ? <span className="text-xs text-[#636366]">…</span> : <StarIcon filled={model.favorited} />}
        </button>

        <button type="button" onClick={onOpen} className="min-h-[52px] min-w-0 flex-1 px-2 py-3 text-left transition active:scale-[0.99]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold text-[#1C1C1E]">{highlight(model.name, query)}</div>
            <span className="rounded-full bg-calorai-bg px-2 py-0.5 text-[11px] font-semibold text-[#636366]">{model.category}</span>
            {model.source === "usda" ? (
              <span className="rounded-full bg-calorai-primary/10 px-2 py-0.5 text-[11px] font-semibold text-calorai-primary">USDA</span>
            ) : null}
            {model.source === "openfoodfacts" ? (
              <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#1C1C1E]">Branded</span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-[#636366]">
            <span className="font-semibold tabular-nums text-calorai-primary">{Math.round(model.calories)} kcal</span>
            <span className="text-[#C7C7CC]">·</span>
            <span>{model.portion}</span>
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
          <svg className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded ? (
        <div className="calorai-enter border-t border-black/[0.06] bg-white px-3 py-2.5 text-xs">
          <div className="grid grid-cols-4 gap-2 text-center sm:grid-cols-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Protein</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(model.protein)} g</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Fat</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(model.fat)} g</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Carbs</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(model.carbs)} g</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]">Fiber</div>
              <div className="font-semibold tabular-nums text-[#1C1C1E]">{fmtMacro(model.fiber)} g</div>
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
  const [pastFoods, setPastFoods] = useState<PastFoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [starringId, setStarringId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedFood, setSelectedFood] = useState<PortionFood | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [apiLoading, setApiLoading] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [usdaFoods, setUsdaFoods] = useState<FoodSearchResult[]>([]);
  const [offFoods, setOffFoods] = useState<FoodSearchResult[]>([]);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualVals, setManualVals] = useState({ name: "", calories: "", protein: "", fat: "", carbs: "", fiber: "" });

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
      setPastFoods(res.ok ? j.items ?? [] : []);
    } catch {
      setPastFoods([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const pastByKey = useMemo(() => {
    const m = new Map<string, PastFoodEntry>();
    for (const p of pastFoods) m.set(p.food_key, p);
    return m;
  }, [pastFoods]);

  const dbModels: FoodCardModel[] = useMemo(() => {
    return FOOD_DATABASE.map((f) => {
      const key = f.name.trim().toLowerCase();
      const past = pastByKey.get(key);
      return {
        key: `db:${f.id}`,
        name: f.name,
        category: categoryShort(f.category),
        calories: f.calories,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        fiber: f.fiber,
        portion: f.serving_unit,
        source: past ? "past" : "local",
        favorited: past?.favorited ?? false,
        pastFoodId: past?.id,
        dbItem: f,
      };
    });
  }, [pastByKey]);

  const favorites = useMemo(() => {
    const list = pastFoods.filter((i) => i.favorited);
    list.sort((a, b) => b.use_count - a.use_count);
    return list;
  }, [pastFoods]);

  const recent = useMemo(() => {
    const list = pastFoods.filter((i) => !i.favorited);
    list.sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());
    return list.slice(0, 10);
  }, [pastFoods]);

  const filteredDb = useMemo(() => {
    const q = query.trim();
    const list = q ? dbModels.filter((m) => matches(q, m.name)) : dbModels;
    const tab = activeTab;
    if (tab === "favorites") return list.filter((m) => m.favorited);
    if (tab === "recent") return [];
    const cat = FOOD_CATEGORIES.find((c) => c.key === tab)?.category;
    if (cat) return list.filter((m) => m.dbItem?.category === cat);
    return list;
  }, [activeTab, dbModels, query]);

  const groupedSearch = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as [string, FoodCardModel[]][];

    const merged: FoodCardModel[] = [];
    for (const p of pastFoods) {
      if (!matches(q, p.food_name)) continue;
      merged.push({
        key: `past:${p.id}`,
        name: p.food_name,
        category: p.favorited ? "Favorite" : "Recent",
        calories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        fiber: (p.fiber ?? 0) as number,
        portion: p.portion ?? "saved",
        source: "past",
        favorited: p.favorited,
        pastFoodId: p.id,
      });
    }
    for (const m of dbModels) {
      if (!matches(q, m.name)) continue;
      merged.push(m);
    }

    const seen = new Set<string>();
    const top: FoodCardModel[] = [];
    for (const m of merged) {
      const k = m.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      top.push(m);
      if (top.length >= 10) break;
    }

    const groups = new Map<string, FoodCardModel[]>();
    for (const m of top) {
      const k = m.dbItem?.category ? categoryShort(m.dbItem.category) : m.category;
      const arr = groups.get(k) ?? [];
      arr.push(m);
      groups.set(k, arr);
    }
    return Array.from(groups.entries());
  }, [dbModels, pastFoods, query]);

  const showNoResults = !loading && query.trim() !== "" && groupedSearch.length === 0;

  const tabFavoritesModels: FoodCardModel[] = useMemo(() => {
    return favorites
      .filter((p) => matches(query, p.food_name))
      .map((p) => ({
        key: `past:${p.id}`,
        name: p.food_name,
        category: "Favorite",
        calories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        fiber: (p.fiber ?? 0) as number,
        portion: p.portion ?? "saved",
        source: "past",
        favorited: p.favorited,
        pastFoodId: p.id,
      }));
  }, [favorites, query]);

  const tabRecentModels: FoodCardModel[] = useMemo(() => {
    return recent
      .filter((p) => matches(query, p.food_name))
      .map((p) => ({
        key: `past:${p.id}`,
        name: p.food_name,
        category: "Recent",
        calories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        fiber: (p.fiber ?? 0) as number,
        portion: p.portion ?? "saved",
        source: "past",
        favorited: p.favorited,
        pastFoodId: p.id,
      }));
  }, [recent, query]);

  async function toggleFavoritePast(entry: PastFoodEntry) {
    setStarringId(entry.id);
    try {
      const res = await fetch(`/api/past-foods/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: !entry.favorited }),
      });
      if (res.ok) await load();
    } finally {
      setStarringId(null);
    }
  }

  async function toggleFavoriteModel(model: FoodCardModel) {
    if (model.pastFoodId) {
      const entry = pastFoods.find((p) => p.id === model.pastFoodId);
      if (entry) await toggleFavoritePast(entry);
      return;
    }

    if (!model.dbItem) return;
    setStarringId(model.key);
    try {
      const res = await fetch("/api/past-foods", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          food_name: model.dbItem.name,
          portion: model.dbItem.serving_unit,
          calories: model.dbItem.calories,
          protein: model.dbItem.protein,
          fat: model.dbItem.fat,
          carbs: model.dbItem.carbs,
          fiber: model.dbItem.fiber,
          favorited: true,
        }),
      });
      if (res.ok) await load();
    } finally {
      setStarringId(null);
    }
  }

  function openFood(model: FoodCardModel) {
    if (model.apiItem) {
      const it = model.apiItem;
      setSelectedFood({
        name: it.name,
        category: model.source === "usda" ? "USDA Database" : "Branded Products",
        serving_size: 100,
        serving_unit: "100 g",
        portion_type: "grams",
        portion_options: [50, 100, 150, 200, 250],
        calories: it.calories,
        protein: it.protein,
        fat: it.fat,
        carbs: it.carbs,
        fiber: it.fiber,
      });
      setModalOpen(true);
      return;
    }

    const db = model.dbItem ?? FOOD_DATABASE.find((f) => f.name.toLowerCase() === model.name.toLowerCase());
    if (!db) return;
    setSelectedFood(db);
    setModalOpen(true);
  }

  // localStorage cache: last 50 queries, 7 day TTL
  const LS_KEY = "calorai_food_search_cache_v1";
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function getCached(q: string): { usda: FoodSearchResult[]; off: FoodSearchResult[]; warning?: string } | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        v: number;
        order: string[];
        entries: Record<string, { ts: number; usda: FoodSearchResult[]; off: FoodSearchResult[]; warning?: string }>;
      };
      if (parsed?.v !== 1) return null;
      const key = q.toLowerCase();
      const hit = parsed.entries?.[key];
      if (!hit) return null;
      if (Date.now() - Number(hit.ts) > TTL_MS) return null;
      return { usda: hit.usda ?? [], off: hit.off ?? [], warning: hit.warning };
    } catch {
      return null;
    }
  }

  function putCached(q: string, payload: { usda: FoodSearchResult[]; off: FoodSearchResult[]; warning?: string }) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const key = q.toLowerCase();
      const now = Date.now();
      const base =
        raw
          ? (JSON.parse(raw) as {
              v: number;
              order: string[];
              entries: Record<string, { ts: number; usda: FoodSearchResult[]; off: FoodSearchResult[]; warning?: string }>;
            })
          : { v: 1, order: [], entries: {} };

      const order = [key, ...(base.order ?? []).filter((k) => k !== key)].slice(0, 50);
      const entries = { ...(base.entries ?? {}) };
      entries[key] = { ts: now, usda: payload.usda, off: payload.off, warning: payload.warning };
      for (const k of Object.keys(entries)) {
        if (!order.includes(k)) delete entries[k];
      }
      localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, order, entries }));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const q = query.trim();
    setApiWarning(null);
    if (!q) {
      setUsdaFoods([]);
      setOffFoods([]);
      setApiLoading(false);
      return;
    }

    const cached = getCached(q);
    if (cached) {
      setUsdaFoods(cached.usda);
      setOffFoods(cached.off);
      if (cached.warning) setApiWarning(cached.warning);
    }

    const t = setTimeout(() => {
      void (async () => {
        setApiLoading(true);
        try {
          const res = await fetch(`/api/food-search?query=${encodeURIComponent(q)}&source=all`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          const j = (await res.json().catch(() => ({}))) as { foods?: FoodSearchResult[]; warning?: string; error?: string };
          if (!res.ok) throw new Error(j.error || "Search failed");
          const foods = j.foods ?? [];
          const usda = foods.filter((f) => f.source === "usda");
          const off = foods.filter((f) => f.source === "openfoodfacts");
          setUsdaFoods(usda);
          setOffFoods(off);
          setApiWarning(j.warning ?? null);
          putCached(q, { usda, off, warning: j.warning });
        } catch {
          // graceful: keep local results
        } finally {
          setApiLoading(false);
        }
      })();
    }, 500);

    return () => clearTimeout(t);
  }, [query]);

  const yourFoods = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    // "Your Foods" = local DB matches + past foods matches
    const merged: FoodCardModel[] = [];
    for (const p of pastFoods) {
      if (!matches(q, p.food_name)) continue;
      merged.push({
        key: `past:${p.id}`,
        name: p.food_name,
        category: p.favorited ? "Favorite" : "Recent",
        calories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs,
        fiber: (p.fiber ?? 0) as number,
        portion: p.portion ?? "saved",
        source: "past",
        favorited: p.favorited,
        pastFoodId: p.id,
      });
    }
    for (const m of dbModels) {
      if (!matches(q, m.name)) continue;
      merged.push(m);
    }
    // de-dupe
    const seen = new Set<string>();
    const out: FoodCardModel[] = [];
    for (const m of merged) {
      const k = m.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(m);
      if (out.length >= 10) break;
    }
    return out;
  }, [dbModels, pastFoods, query]);

  const usdaModels: FoodCardModel[] = useMemo(
    () =>
      usdaFoods.map((f, i) => ({
        key: `usda:${i}:${f.name}`,
        name: f.name,
        category: "USDA Database",
        calories: f.calories,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        fiber: f.fiber,
        portion: `${f.serving_size} ${f.serving_unit}`,
        source: "usda",
        favorited: false,
        apiItem: f,
      })),
    [usdaFoods]
  );

  const offModels: FoodCardModel[] = useMemo(
    () =>
      offFoods.map((f, i) => ({
        key: `off:${i}:${f.name}`,
        name: f.name,
        category: "Branded Products",
        calories: f.calories,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        fiber: f.fiber,
        portion: `${f.serving_size} ${f.serving_unit}`,
        source: "openfoodfacts",
        favorited: false,
        apiItem: f,
      })),
    [offFoods]
  );

  async function addManual() {
    const name = manualVals.name.trim() || query.trim();
    const calories = Number(manualVals.calories);
    if (!name || !Number.isFinite(calories)) return;
    const protein = manualVals.protein.trim() ? Number(manualVals.protein) : 0;
    const fat = manualVals.fat.trim() ? Number(manualVals.fat) : 0;
    const carbs = manualVals.carbs.trim() ? Number(manualVals.carbs) : 0;
    const fiber = manualVals.fiber.trim() ? Number(manualVals.fiber) : 0;
    const res = await fetch("/api/meals", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ date: effectiveDate, food_name: name, calories, protein, fat, carbs, fiber }),
    });
    if (res.ok) {
      setToast(`Added ${name}`);
      setManualOpen(false);
      setManualVals({ name: "", calories: "", protein: "", fat: "", carbs: "", fiber: "" });
      onMealLogged?.();
      void load();
    }
  }

  return (
    <section className="relative calorai-enter calorai-enter-delay-2 flex flex-col overflow-hidden rounded-[var(--calorai-radius-card)] border border-[var(--calorai-border)] bg-white p-5 shadow-[var(--calorai-shadow-sm)] md:min-h-0 md:flex-1">
      {toast ? (
        <div
          className="cal-cal-toast-enter fixed bottom-6 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-[var(--calorai-radius-card)] bg-[var(--calorai-text)] px-4 py-3 text-center text-sm font-medium text-white shadow-[var(--calorai-shadow-lg)]"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="mb-3">
        <h2 className="text-base font-bold text-[var(--calorai-text)]">Food library</h2>
        <p className="mt-0.5 text-sm text-[var(--calorai-text-secondary)]">
          Pick a food, adjust portions, add to your selected date.
        </p>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto whitespace-nowrap pb-1 [-webkit-overflow-scrolling:touch]">
        {FOOD_CATEGORIES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeTab === t.key ? "bg-calorai-primary text-white shadow-sm" : "bg-calorai-bg text-[#1C1C1E] hover:bg-black/[0.06]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C7C7CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search foods… (top 10)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="cal-input w-full py-3 pl-11 pr-4 text-sm focus:bg-white"
        />
      </div>

      <div className="food-items-grid min-h-0 flex-1 overflow-visible pr-1 md:overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-sm text-[#636366]">Loading history…</p>
        ) : showNoResults ? (
          <div className="rounded-xl border border-dashed border-[var(--calorai-border)] bg-calorai-bg px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--calorai-text)]">🔍 Nothing found</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--calorai-text-secondary)]">
              Try different keywords or add food manually.
            </p>
          </div>
        ) : query.trim() ? (
          <div className="space-y-7">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#636366]">Your Foods</h3>
            {yourFoods.length === 0 ? (
              <p className="text-sm text-[#636366]">No local matches.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {yourFoods.map((m) => (
                  <LibraryFoodCard
                    key={m.key}
                    model={m}
                    query={query}
                    starBusy={starringId === m.pastFoodId || starringId === m.key}
                    onFavorite={() => void toggleFavoriteModel(m)}
                    onOpen={() => openFood(m)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#636366]">USDA Database</h3>
              {apiLoading ? <span className="text-xs text-[#636366]">Searching USDA database…</span> : null}
            </div>
            {usdaModels.length === 0 ? (
              <p className="text-sm text-[#636366]">No USDA results.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {usdaModels.map((m) => (
                  <LibraryFoodCard key={m.key} model={m} query={query} starBusy={false} onFavorite={() => {}} onOpen={() => openFood(m)} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#636366]">Branded Products</h3>
            {offModels.length === 0 ? (
              <p className="text-sm text-[#636366]">No branded results.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {offModels.map((m) => (
                  <LibraryFoodCard key={m.key} model={m} query={query} starBusy={false} onFavorite={() => {}} onOpen={() => openFood(m)} />
                ))}
              </div>
            )}
          </div>

          {apiWarning ? (
            <p className="text-sm text-[#636366]">{apiWarning}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setManualVals((v) => ({ ...v, name: query.trim() }));
                setManualOpen(true);
              }}
              className="btn-secondary rounded-[var(--calorai-radius-btn)] px-6 py-3 text-sm"
            >
              Can't find it? Add manually
            </button>
          </div>
        </div>
        ) : activeTab === "favorites" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tabFavoritesModels.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-[var(--calorai-border)] bg-calorai-bg px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--calorai-text)]">⭐ No favorites yet</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--calorai-text-secondary)]">
                Star foods from the library for quick-log later.
              </p>
            </div>
          ) : (
            tabFavoritesModels.map((m) => (
              <LibraryFoodCard
                key={m.key}
                model={m}
                query=""
                starBusy={starringId === m.pastFoodId}
                onFavorite={() => void toggleFavoriteModel(m)}
                onOpen={() => openFood(m)}
              />
            ))
          )}
        </div>
      ) : activeTab === "recent" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tabRecentModels.length === 0 ? (
            <p className="py-6 text-sm text-[#636366]">Scan meals or add from the database to populate Recents.</p>
          ) : (
            tabRecentModels.map((m) => (
              <LibraryFoodCard
                key={m.key}
                model={m}
                query=""
                starBusy={starringId === m.pastFoodId}
                onFavorite={() => void toggleFavoriteModel(m)}
                onOpen={() => openFood(m)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filteredDb.slice(0, 60).map((m) => (
            <LibraryFoodCard
              key={m.key}
              model={m}
              query=""
              starBusy={starringId === m.pastFoodId || starringId === m.key}
              onFavorite={() => void toggleFavoriteModel(m)}
              onOpen={() => openFood(m)}
            />
          ))}
        </div>
        )}
      </div>

      <FoodSelectionModal
        open={modalOpen}
        food={selectedFood}
        date={effectiveDate}
        onClose={() => setModalOpen(false)}
        onLogged={(msg) => {
          setToast(msg);
          onMealLogged?.();
          void load();
        }}
      />

      {manualOpen ? (
        <div
          className="fixed inset-0 z-[70] flex animate-[calorai-modal-fadeIn_0.3s_ease-in-out_both] items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setManualOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[var(--calorai-radius-modal)] bg-white p-5 shadow-[var(--calorai-shadow-lg)] animate-[calorai-modal-scaleIn_0.3s_ease-out_both] sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">Manual add</p>
              <h3 className="mt-1 text-lg font-bold text-[var(--calorai-text)]">Add a food manually</h3>
            </div>
            <div className="grid gap-3">
              <Field label="Food name">
                <input
                  value={manualVals.name}
                  onChange={(e) => setManualVals((v) => ({ ...v, name: e.target.value }))}
                  className="cal-input w-full text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Calories (kcal)" value={manualVals.calories} onChange={(s) => setManualVals((v) => ({ ...v, calories: s }))} />
                <NumField label="Protein (g)" value={manualVals.protein} onChange={(s) => setManualVals((v) => ({ ...v, protein: s }))} />
                <NumField label="Fat (g)" value={manualVals.fat} onChange={(s) => setManualVals((v) => ({ ...v, fat: s }))} />
                <NumField label="Carbs (g)" value={manualVals.carbs} onChange={(s) => setManualVals((v) => ({ ...v, carbs: s }))} />
                <NumField label="Fiber (g)" value={manualVals.fiber} onChange={(s) => setManualVals((v) => ({ ...v, fiber: s }))} />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setManualOpen(false)} className="btn-secondary min-h-[48px] w-full sm:w-auto">
                Cancel
              </button>
              <button type="button" onClick={() => void addManual()} className="btn-primary min-h-[48px] w-full sm:w-auto">
                Add to log
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <Field label={label}>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cal-input w-full text-sm tabular-nums"
      />
    </Field>
  );
}

