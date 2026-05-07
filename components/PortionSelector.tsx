"use client";

import React, { useMemo } from "react";
import type { PortionType } from "@/lib/foodDatabase";

type Macros = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};

export type PortionFood = {
  name: string;
  category: string;
  serving_size: number;
  serving_unit: string;
  portion_type: PortionType;
  portion_options: number[];
  portion_option_labels?: Record<string, string>;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};

export type PortionState = {
  /** Quantity in unit (slices/pieces/cups/tbsp/scoops/bowls) OR grams when portion_type="grams". */
  quantity: number;
  grams: number;
  display: string;
  macros: Macros;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function scaleMacros(base: Macros, ratio: number): Macros {
  return {
    calories: Math.round(base.calories * ratio),
    protein: round1(base.protein * ratio),
    fat: round1(base.fat * ratio),
    carbs: round1(base.carbs * ratio),
    fiber: round1(base.fiber * ratio),
  };
}

function unitLabel(t: PortionType): { singular: string; plural: string; step: number } {
  switch (t) {
    case "slices":
      return { singular: "slice", plural: "slices", step: 1 };
    case "pieces":
      return { singular: "piece", plural: "pieces", step: 1 };
    case "cups":
      return { singular: "cup", plural: "cups", step: 0.25 };
    case "tablespoons":
      return { singular: "tbsp", plural: "tbsp", step: 0.5 };
    case "scoops":
      return { singular: "scoop", plural: "scoops", step: 0.5 };
    case "bowls":
      return { singular: "bowl", plural: "bowls", step: 1 };
    case "grams":
    default:
      return { singular: "g", plural: "g", step: 25 };
    case "serving":
      return { singular: "serving", plural: "servings", step: 1 };
  }
}

function QuickButtons({
  options,
  value,
  onPick,
  format,
}: {
  options: number[];
  value: number;
  onPick: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onPick(o)}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
            Math.abs(o - value) < 1e-9
              ? "border-calorai-primary/30 bg-calorai-primary/10 text-[#1C1C1E]"
              : "border-black/[0.08] bg-white text-[#1C1C1E] hover:bg-calorai-bg"
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

export function computePortionState(food: PortionFood, quantity: number): PortionState {
  const q = Number.isFinite(quantity) ? quantity : 1;
  const base = food.portion_type === "serving" ? Math.max(1, Number(food.serving_size) || 1) : 1;
  const ratio = q / base;

  const grams =
    food.portion_type === "serving"
      ? Math.max(1, Math.round(q)) // for drinks: treat as ml ~ grams
      : Math.max(1, Math.round(food.serving_size * ratio));
  const macros = scaleMacros(
    {
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
      fiber: food.fiber,
    },
    ratio
  );

  const u = unitLabel(food.portion_type);
  const display =
    food.portion_type === "grams"
      ? `${Math.round(q)} g`
      : food.portion_type === "serving"
        ? `${Math.round(q)} ml`
        : `${q % 1 === 0 ? Math.round(q) : q} ${q === 1 ? u.singular : u.plural}`;

  return { quantity: q, grams, display, macros };
}

export default function PortionSelector({
  food,
  quantity,
  onQuantityChange,
}: {
  food: PortionFood;
  quantity: number;
  onQuantityChange: (q: number) => void;
}) {
  const u = unitLabel(food.portion_type);

  const derived = useMemo(() => computePortionState(food, quantity), [food, quantity]);

  const quickOptions = useMemo(() => {
    if (food.portion_type === "serving") return food.portion_options;
    if (food.portion_type === "grams") return food.portion_options;
    // Use per-type defaults when missing / too short.
    if (food.portion_options?.length >= 3) return food.portion_options;
    if (food.portion_type === "slices") return [1, 2, 3, 4];
    if (food.portion_type === "pieces") return [1, 2, 3, 5];
    if (food.portion_type === "cups") return [0.5, 1, 1.5, 2];
    if (food.portion_type === "tablespoons") return [0.5, 1, 2, 3];
    if (food.portion_type === "scoops") return [1, 1.5, 2];
    if (food.portion_type === "bowls") return [1, 2, 3];
    return [1, 2, 3];
  }, [food.portion_options, food.portion_type]);

  const minQ =
    food.portion_type === "serving"
      ? 100
      : food.portion_type === "cups" || food.portion_type === "tablespoons" || food.portion_type === "scoops"
        ? 0.25
        : 1;
  const maxQ = food.portion_type === "serving" ? 2000 : food.portion_type === "grams" ? 500 : 12;

  const formatQuick = (n: number) => {
    if (food.portion_type === "serving") {
      const label = food.portion_option_labels?.[String(n)];
      const cal = computePortionState(food, n).macros.calories;
      return label ? `${label} (${Math.round(n)}ml) — ${cal} kcal` : `${Math.round(n)} ml`;
    }
    if (food.portion_type === "grams") return `${Math.round(n)} g`;
    const unit = n === 1 ? u.singular : u.plural;
    return `${n % 1 === 0 ? Math.round(n) : n} ${unit}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">Portion</p>
          <p className="mt-1 text-base font-bold text-[#1C1C1E]">
            {derived.display}
            <span className="ml-2 text-sm font-semibold text-[#636366]">({derived.grams} g)</span>
          </p>
        </div>

        {food.portion_type === "grams" || food.portion_type === "serving" ? null : (
          <div className="flex items-center gap-1 rounded-2xl border border-black/[0.08] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onQuantityChange(clamp(round1(quantity - u.step), minQ, maxQ))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-[#636366] transition hover:bg-calorai-bg active:scale-95"
              aria-label="Decrease portion"
            >
              −
            </button>
            <div className="min-w-[84px] px-2 text-center">
              <div className="text-sm font-bold tabular-nums text-[#1C1C1E]">{quantity % 1 === 0 ? Math.round(quantity) : quantity}</div>
              <div className="text-[11px] text-[#636366]">{quantity === 1 ? u.singular : u.plural}</div>
            </div>
            <button
              type="button"
              onClick={() => onQuantityChange(clamp(round1(quantity + u.step), minQ, maxQ))}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-[#636366] transition hover:bg-calorai-bg active:scale-95"
              aria-label="Increase portion"
            >
              +
            </button>
          </div>
        )}
      </div>

      {food.portion_type === "serving" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {quickOptions.map((o) => (
              <button
                key={String(o)}
                type="button"
                onClick={() => onQuantityChange(o)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
                  Math.abs(o - quantity) < 1e-6
                    ? "border-calorai-primary/30 bg-calorai-primary/10 text-[#1C1C1E]"
                    : "border-black/[0.08] bg-white text-[#1C1C1E] hover:bg-calorai-bg"
                }`}
              >
                {formatQuick(o)}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-calorai-bg p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#636366]">Custom amount</span>
              <span className="text-sm font-semibold tabular-nums text-[#1C1C1E]">{Math.round(quantity)} ml</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={10}
              value={Math.round(quantity)}
              onChange={(e) => onQuantityChange(clamp(Number(e.target.value), 100, 2000))}
              className="mt-3 w-full accent-[var(--calorai-primary)]"
            />
            <div className="mt-2 flex items-baseline justify-between text-xs text-[#636366]">
              <span>100 ml</span>
              <span>2000 ml</span>
            </div>
          </div>
        </div>
      ) : food.portion_type === "grams" ? (
        <div className="space-y-3">
          <input
            type="range"
            min={25}
            max={500}
            step={5}
            value={Math.round(quantity)}
            onChange={(e) => onQuantityChange(clamp(Number(e.target.value), 25, 500))}
            className="w-full accent-[var(--calorai-primary)]"
          />
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[#636366]">25 g</span>
            <span className="font-semibold tabular-nums text-[#1C1C1E]">{Math.round(quantity)} g</span>
            <span className="text-[#636366]">500 g</span>
          </div>
        </div>
      ) : null}

      {food.portion_type === "serving" ? null : (
        <QuickButtons options={quickOptions} value={quantity} onPick={onQuantityChange} format={formatQuick} />
      )}

      <div className="rounded-2xl border border-black/[0.06] bg-calorai-bg p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="Calories" value={`${derived.macros.calories}`} unit="kcal" strong />
          <Metric label="Protein" value={derived.macros.protein} unit="g" />
          <Metric label="Fat" value={derived.macros.fat} unit="g" />
          <Metric label="Carbs" value={derived.macros.carbs} unit="g" />
          <Metric label="Fiber" value={derived.macros.fiber} unit="g" />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  strong,
}: {
  label: string;
  value: number | string;
  unit: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#636366]">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${strong ? "text-calorai-primary" : "text-[#1C1C1E]"}`}>
        {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{" "}
        <span className="text-xs font-medium text-[#636366]">{unit}</span>
      </div>
    </div>
  );
}

