"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { DailyGoals, MacroTotals } from "@/lib/types";
import { Settings } from "lucide-react";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";

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
const SUCCESS = "#00C853";
const WARNING = "#FF9500";
const PROTEIN = "#007AFF";
const FAT = "#FF9500";
const CARBS = "#00C853";

function ringColor(pct: number) {
  if (pct < 50) return WARNING;
  if (pct < 100) return SUCCESS;
  return PRIMARY;
}

function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const g = goal > 0 ? goal : 1;
  const pct = (value / g) * 100;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayValue = useAnimatedNumber(value, 1000);
  const animatedPct = useMemo(() => (mounted ? clamp(pct, 0, 110) : 0), [mounted, pct]);
  const offset = c * (1 - clamp(animatedPct, 0, 100) / 100);
  const color = ringColor(pct);
  const remaining = goal - value;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
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
            stroke={color}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 1000ms cubic-bezier(0.2, 0.8, 0.2, 1), stroke 300ms ease-in-out",
              filter: `drop-shadow(0 0 10px ${color}33) drop-shadow(0 0 18px ${color}22)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--calorai-text)]">
            {Math.round(displayValue)}
          </span>
          <span className="mt-0.5 block text-sm font-medium text-[var(--calorai-text-secondary)]">
            / {fmt(goal)} kcal
          </span>
          {goal > 0 ? (
            <span className="mt-2 text-xs font-medium text-[var(--calorai-text-secondary)]">
              {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
            </span>
          ) : (
            <span className="mt-2 text-xs text-[var(--calorai-text-secondary)]">Set a calorie goal</span>
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
  const animValue = useAnimatedNumber(value, 500);
  const widthPct = goal > 0 ? clamp((animValue / Math.max(goal, 1)) * 100, 0, 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-[var(--calorai-text)]">{label}</span>
        <span className="tabular-nums text-[var(--calorai-text-secondary)]">
          <span className="font-semibold text-[var(--calorai-text)]">{fmt(animValue)}g</span>
          <span className="mx-1 text-[var(--calorai-border)]">/</span>
          <span>{fmt(goal)}g</span>
        </span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div className="cal-macro-fill h-full rounded-full" style={{ width: `${widthPct}%`, backgroundColor: color }} />
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
    <div className="relative calorai-enter rounded-[var(--calorai-radius-card)] border border-[var(--calorai-border)] bg-white p-6 shadow-[var(--calorai-shadow-sm)]">
      <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={onSetGoals}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-calorai-bg text-[var(--calorai-text-secondary)] transition hover:bg-black/[0.06] active:scale-95"
          aria-label="Set daily goals"
        >
          <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex justify-center pb-2 pt-2">
        <CalorieRing value={totals.calories ?? 0} goal={goals.calorie_goal} />
      </div>

      <div className="mt-8 space-y-5 border-t border-[var(--calorai-border)] pt-6">
        <MacroBar label="Protein" value={totals.protein ?? 0} goal={goals.protein_goal} color={PROTEIN} />
        <MacroBar label="Fat" value={totals.fat ?? 0} goal={goals.fat_goal} color={FAT} />
        <MacroBar label="Carbs" value={totals.carbs ?? 0} goal={goals.carbs_goal} color={CARBS} />
      </div>

      {fiberGoal !== undefined && Number.isFinite(fiberGoal) && fiberGoal > 0 ? (
        <p className="mt-5 text-center text-xs text-[var(--calorai-text-secondary)]">
          Fiber target <span className="font-semibold text-[var(--calorai-text)]">{Math.round(fiberGoal)} g</span>
        </p>
      ) : null}
    </div>
  );
}
