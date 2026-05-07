"use client";

import React, { useEffect, useMemo, useState } from "react";
import PortionSelector, { computePortionState, type PortionFood } from "@/components/PortionSelector";

export default function FoodSelectionModal({
  open,
  food,
  date,
  onClose,
  onLogged,
}: {
  open: boolean;
  food: PortionFood | null;
  date: string;
  onClose: () => void;
  onLogged?: (message: string) => void;
}) {
  const [quantity, setQuantity] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !food) return;
    // reset to default base portion
    setQuantity(food.portion_type === "grams" ? food.serving_size : 1);
  }, [open, food]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const derived = useMemo(() => {
    if (!food) return null;
    return computePortionState(food, quantity);
  }, [food, quantity]);

  if (!open || !food || !derived) return null;

  async function addToLog() {
    setBusy(true);
    try {
      const f = food!;
      const d = computePortionState(f, quantity);
      const portion = `${d.display} (${d.grams} g)`;
      const res = await fetch("/api/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          date,
          food_name: f.name,
          portion,
          calories: d.macros.calories,
          protein: d.macros.protein,
          fat: d.macros.fat,
          carbs: d.macros.carbs,
          fiber: d.macros.fiber,
          // no ai_* fields for manual DB adds
          ai_food_name: null,
          ai_calories: null,
          ai_protein: null,
          ai_fat: null,
          ai_carbs: null,
          ai_confidence: null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to log meal.");

      const msg = `Added ${d.display} of ${f.name} (${d.macros.calories} cal)`;
      setToast(msg);
      onLogged?.(msg);
      // Parent is responsible for refreshing totals/meals.
      onClose();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        /* noop */
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="calorai-enter flex w-full max-w-[500px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">{food.category}</p>
            <h3 className="mt-1 truncate text-lg font-bold text-[#1C1C1E]">{food.name}</h3>
            <p className="mt-1 text-sm text-[#636366]">
              Default: {food.serving_unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-calorai-bg text-[#636366] transition hover:bg-black/[0.06] active:scale-95"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
          <PortionSelector food={food} quantity={quantity} onQuantityChange={setQuantity} />
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-black/[0.06] bg-white p-4 sm:flex-row sm:justify-end sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-2xl border border-black/[0.08] bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-calorai-bg active:scale-[0.99]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void addToLog()}
            className="min-h-[48px] rounded-2xl bg-calorai-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add to log"}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          className="calorai-enter fixed bottom-6 left-1/2 z-[70] max-w-sm -translate-x-1/2 rounded-2xl border border-black/[0.08] bg-[#1C1C1E] px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

