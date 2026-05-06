"use client";

import React from "react";
import type { DailyGoals, MacroTotals } from "@/lib/types";

type MetricKey = "calories" | "protein" | "fat" | "carbs";

type RingSpec = {
  key: MetricKey;
  label: string;
  colorClass: string;
  unit: string;
  goalKey: keyof Pick<DailyGoals, "calorie_goal" | "protein_goal" | "fat_goal" | "carbs_goal">;
};

const RINGS: RingSpec[] = [
  { key: "calories", label: "Calories", colorClass: "text-purple-600", unit: "kcal", goalKey: "calorie_goal" },
  { key: "protein", label: "Protein", colorClass: "text-red-600", unit: "g", goalKey: "protein_goal" },
  { key: "fat", label: "Fat", colorClass: "text-orange-600", unit: "g", goalKey: "fat_goal" },
  { key: "carbs", label: "Carbs", colorClass: "text-green-600", unit: "g", goalKey: "carbs_goal" },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function MetricRing({
  label,
  value,
  goal,
  unit,
  colorClass,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  colorClass: string;
}) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const pctClamped = clamp(pct, 0, 999);
  const offset = c * (1 - clamp(pct, 0, 100) / 100);
  const remaining = goal - value;

  return (
    <div className="rounded-xl bg-white/90 shadow-sm ring-1 ring-black/5 p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            Goal: <span className="font-medium text-slate-700">{fmt(goal)}</span> {unit}
          </div>
        </div>
        <div className={`text-xs font-semibold ${colorClass}`}>
          {goal > 0 ? `${Math.round(pctClamped)}%` : "—"}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="block">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              className="text-slate-200"
              stroke="currentColor"
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              className={colorClass}
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: "stroke-dashoffset 250ms ease",
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-bold text-slate-900 leading-none">{fmt(value)}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              {unit} consumed
            </div>
            <div className="mt-2 text-[11px] font-medium">
              {goal <= 0 ? (
                <span className="text-slate-500">Set a goal</span>
              ) : remaining >= 0 ? (
                <span className="text-slate-600">
                  {fmt(remaining)} {unit} left
                </span>
              ) : (
                <span className="text-slate-600">
                  {fmt(Math.abs(remaining))} {unit} over
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MacroRing({ goals, totals }: { goals: DailyGoals; totals: MacroTotals }) {
  const fiberGoal = goals.fiber_goal;
  return (
    <div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {RINGS.map((r) => {
        const value = totals[r.key] ?? 0;
        const goal =
          r.goalKey === "calorie_goal"
            ? goals.calorie_goal
            : r.goalKey === "protein_goal"
              ? goals.protein_goal
              : r.goalKey === "fat_goal"
                ? goals.fat_goal
                : goals.carbs_goal;

        return (
          <MetricRing
            key={r.key}
            label={r.label}
            value={value}
            goal={goal}
            unit={r.unit}
            colorClass={r.colorClass}
          />
        );
      })}
    </div>
    {fiberGoal !== undefined && Number.isFinite(fiberGoal) && fiberGoal > 0 ? (
      <p className="mt-3 text-center text-sm text-slate-600">
        Fiber goal: <span className="font-semibold text-slate-800">{Math.round(fiberGoal)} g</span>
        <span className="text-slate-400"> — general wellness target (meals may not sum fiber)</span>
      </p>
    ) : null}
    </div>
  );
}

