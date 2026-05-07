"use client";

import React from "react";
import type { DailyGoals, MacroTotals } from "@/lib/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function CalorieRing({
  value,
  goal,
}: {
  value: number;
  goal: number;
}) {
  const size = 176;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  const offset = c * (1 - clamp(pct, 0, 100) / 100);
  const remaining = goal - value;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-sm font-semibold text-slate-500">Calories</p>
      <div className="relative mt-3" style={{ width: size, height: size }}>
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
            className="text-violet-600"
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 280ms ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold tabular-nums text-slate-900">{fmt(value)}</span>
          <span className="text-xs text-slate-500">/ {fmt(goal)} kcal</span>
          <span className="mt-2 text-xs font-medium text-slate-600">
            {goal <= 0 ? (
              "Set a calorie goal"
            ) : remaining >= 0 ? (
              <>{fmt(remaining)} kcal left</>
            ) : (
              <>{fmt(Math.abs(remaining))} kcal over</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  goal,
  unit,
  barClass,
  pctClass,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  barClass: string;
  pctClass: string;
}) {
  const pct = goal > 0 ? clamp((value / goal) * 100, 0, 999) : 0;
  const widthPct = goal > 0 ? clamp((value / goal) * 100, 0, 100) : 0;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className={`text-xs font-semibold ${pctClass}`}>{goal > 0 ? `${Math.round(pct)}%` : "—"}</span>
      </div>
      <div className="mt-1 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{fmt(value)}</span>
        <span className="text-slate-400"> / </span>
        <span>{fmt(goal)}</span>
        <span className="text-slate-500">{unit}</span>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroRing({ goals, totals }: { goals: DailyGoals; totals: MacroTotals }) {
  const fiberGoal = goals.fiber_goal;

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <CalorieRing value={totals.calories ?? 0} goal={goals.calorie_goal} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MacroBar
          label="Protein"
          value={totals.protein ?? 0}
          goal={goals.protein_goal}
          unit=" g"
          barClass="bg-red-500"
          pctClass="text-red-600"
        />
        <MacroBar
          label="Carbs"
          value={totals.carbs ?? 0}
          goal={goals.carbs_goal}
          unit=" g"
          barClass="bg-emerald-500"
          pctClass="text-emerald-600"
        />
        <MacroBar
          label="Fat"
          value={totals.fat ?? 0}
          goal={goals.fat_goal}
          unit=" g"
          barClass="bg-amber-500"
          pctClass="text-amber-600"
        />
      </div>

      {fiberGoal !== undefined && Number.isFinite(fiberGoal) && fiberGoal > 0 ? (
        <p className="text-center text-sm text-slate-600">
          Fiber goal: <span className="font-semibold text-slate-800">{Math.round(fiberGoal)} g</span>
          <span className="text-slate-400"> — wellness target (meals may not sum fiber)</span>
        </p>
      ) : null}
    </div>
  );
}
