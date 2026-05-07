"use client";

import React, { useEffect, useMemo, useState } from "react";
import PortionSelector, { computePortionState, type PortionFood } from "@/components/PortionSelector";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !food) return;
    // reset to default base portion
    setQuantity(food.portion_type === "grams" ? food.serving_size : 1);
  }, [open, food]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const derived = useMemo(() => {
    if (!food) return null;
    return computePortionState(food, quantity);
  }, [food, quantity]);

  if (!mounted || !open || !food || !derived) return null;

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

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="md:hidden">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/[0.12]" aria-hidden />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-[var(--calorai-border)] pb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">{food.category}</p>
            <h3 className="mt-1 truncate text-lg font-bold text-[var(--calorai-text)]">{food.name}</h3>
            <p className="mt-1 text-sm text-[var(--calorai-text-secondary)]">Default: {food.serving_unit}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-calorai-bg text-[var(--calorai-text-secondary)] transition hover:bg-black/[0.06] active:scale-95"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body pt-5">
          <PortionSelector food={food} quantity={quantity} onQuantityChange={setQuantity} />
        </div>

        <div className="modal-buttons">
          <button type="button" onClick={onClose} className="btn-secondary w-full min-h-[48px] sm:w-auto">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void addToLog()}
            className="btn-primary w-full min-h-[48px] sm:w-auto"
          >
            {busy ? "Adding…" : "Add to log"}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          className="cal-cal-toast-enter fixed left-1/2 top-4 z-[70] max-w-[min(92vw,420px)] -translate-x-1/2 rounded-[var(--calorai-radius-card)] bg-[var(--calorai-text)] px-4 py-3 text-center text-sm font-medium text-white shadow-[var(--calorai-shadow-lg)]"
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

