"use client";

import React, { useEffect, useState } from "react";
import PortionAdjuster from "@/components/PortionAdjuster";

function ConfidenceBadge({ confidence }) {
  const c = Number(confidence);
  const v = Number.isFinite(c) ? c : 0;
  if (v >= 80) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-200">
        High confidence
      </span>
    );
  }
  if (v >= 60) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
        Medium confidence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-900 ring-1 ring-red-200">
      Low confidence — please review
    </span>
  );
}

function NumField({ label, value, onChange, disabled, flash }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        disabled={disabled}
        value={Number.isFinite(Number(value)) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition-colors ${
          flash ? "bg-amber-50 border-amber-300 ring-1 ring-amber-200" : "bg-white"
        }`}
      />
    </label>
  );
}

export default function FoodItemCard({ item, onChange, onGramsChange, onRemove, disabled }) {
  const patch = (p) => onChange({ ...item, ...p });
  const [open, setOpen] = useState(true);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [item.calories, item.protein, item.fat, item.carbs, item.fiber, item.grams]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{item.food_name || "Food item"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              {Math.round(item.grams)} g · {item.portion_display || "—"}
            </span>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
        </div>
        <span className="shrink-0 text-slate-400">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Food name</span>
            <input
              type="text"
              disabled={disabled}
              value={item.food_name}
              onChange={(e) => patch({ food_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Portion (everyday units)</span>
            <input
              type="text"
              disabled={disabled}
              value={item.portion_display}
              onChange={(e) => patch({ portion_display: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
              placeholder='e.g. "1 cup"'
            />
          </label>

          <PortionAdjuster
            grams={item.grams}
            baselineGrams={item.ai_grams}
            disabled={disabled}
            onGramsChange={(g) => onGramsChange(g)}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumField
              label="Calories"
              value={item.calories}
              flash={flash}
              disabled={disabled}
              onChange={(v) => patch({ calories: Number.isFinite(v) ? Math.round(v) : 0 })}
            />
            <NumField
              label="Protein (g)"
              value={item.protein}
              flash={flash}
              disabled={disabled}
              onChange={(v) => patch({ protein: Number.isFinite(v) ? Math.round(v * 10) / 10 : 0 })}
            />
            <NumField
              label="Fat (g)"
              value={item.fat}
              flash={flash}
              disabled={disabled}
              onChange={(v) => patch({ fat: Number.isFinite(v) ? Math.round(v * 10) / 10 : 0 })}
            />
            <NumField
              label="Carbs (g)"
              value={item.carbs}
              flash={flash}
              disabled={disabled}
              onChange={(v) => patch({ carbs: Number.isFinite(v) ? Math.round(v * 10) / 10 : 0 })}
            />
            <NumField
              label="Fiber (g)"
              value={item.fiber}
              flash={flash}
              disabled={disabled}
              onChange={(v) => patch({ fiber: Number.isFinite(v) ? Math.round(v * 10) / 10 : 0 })}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
            >
              <span aria-hidden>✕</span> Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
