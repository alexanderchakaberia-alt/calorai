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

const PRIMARY = "#007AFF";
const PROTEIN = "#007AFF";
const FAT = "#FF9500";
const CARBS = "#34C759";

function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const g = goal > 0 ? goal : 1;
  const pct = (value / g) * 100;
  const offset = c * (1 - clamp(pct, 0, 100) / 100);
  const remaining = goal - value;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block drop-shadow-sm">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="text-black/[0.06]"
            stroke="currentColor"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            stroke={PRIMARY}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 480ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-[#1C1C1E] transition-all duration-300">
            {Math.round(value)}
          </span>
          <span className="mt-0.5 text-sm font-medium text-[#636366]">
            / {fmt(goal)} <span className="text-[#636366]">kcal</span>
          </span>
          {goal > 0 ? (
            <span className="mt-2 text-xs font-medium text-[#636366]">
              {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
            </span>
          ) : (
            <span className="mt-2 text-xs text-[#636366]">Set a calorie goal</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const widthPct = goal > 0 ? clamp((value / goal) * 100, 0, 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-[#1C1C1E]">{label}</span>
        <span className="tabular-nums text-[#636366]">
          <span className="font-semibold text-[#1C1C1E]">{fmt(value)}g</span>
          <span className="mx-1 text-[#C7C7CC]">/</span>
          <span>{fmt(goal)}g</span>
        </span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${widthPct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export function MacroRing({
  goals,
  totals,
  onSetGoals,
}: {
  goals: DailyGoals;
  totals: MacroTotals;
  onSetGoals?: () => void;
}) {
  const fiberGoal = goals.fiber_goal;

  return (
    <div className="relative rounded-2xl bg-white p-5 shadow-card calorai-enter sm:p-6">
      <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={onSetGoals}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-calorai-bg text-[#636366] transition hover:bg-black/[0.06] active:scale-95"
          aria-label="Set daily goals"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="flex justify-center pb-2 pt-2">
        <CalorieRing value={totals.calories ?? 0} goal={goals.calorie_goal} />
      </div>

      <div className="mt-8 space-y-5 border-t border-black/[0.06] pt-6">
        <MacroBar label="Protein" value={totals.protein ?? 0} goal={goals.protein_goal} color={PROTEIN} />
        <MacroBar label="Fat" value={totals.fat ?? 0} goal={goals.fat_goal} color={FAT} />
        <MacroBar label="Carbs" value={totals.carbs ?? 0} goal={goals.carbs_goal} color={CARBS} />
      </div>

      {fiberGoal !== undefined && Number.isFinite(fiberGoal) && fiberGoal > 0 ? (
        <p className="mt-5 text-center text-xs text-[#636366]">
          Fiber target <span className="font-semibold text-[#1C1C1E]">{Math.round(fiberGoal)} g</span>
        </p>
      ) : null}
    </div>
  );
}
