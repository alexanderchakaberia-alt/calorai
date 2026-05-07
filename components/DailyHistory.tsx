"use client";

import type { DailyHistoryRollup } from "@/lib/types";
import React, { useCallback, useEffect, useMemo, useState } from "react";

function utcTodayParts() {
  return new Date().toISOString().slice(0, 10);
}

function subtractUtcDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pct(n: number, d: number) {
  if (!d || !Number.isFinite(d)) return 0;
  return Math.min(100, Math.max(0, (n / d) * 100));
}

type StatusTone = "ok" | "low" | "high";

function statusForCalories(cal: number, goal: number): { tone: StatusTone; label: string } {
  if (!goal || goal <= 0) return { tone: "ok", label: "No goal set" };
  const r = cal / goal;
  if (r >= 0.9 && r <= 1.1) return { tone: "ok", label: "Goal hit ✓" };
  if (r < 0.9) return { tone: "low", label: "Under goal ✗" };
  return { tone: "high", label: "Over goal ⚠" };
}

function barTone(tone: StatusTone): string {
  if (tone === "ok") return "bg-calorai-success";
  if (tone === "low") return "bg-calorai-warning";
  return "bg-[var(--calorai-error)]";
}

export function DailyHistory({
  calorieGoal,
  refreshKey,
  onSelectDay,
}: {
  calorieGoal: number;
  refreshKey: number;
  onSelectDay: (isoDate: string) => void;
}) {
  const [rollups, setRollups] = useState<DailyHistoryRollup[]>([]);
  const [todayMeta, setTodayMeta] = useState<string>(() => utcTodayParts());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const yesterday = useMemo(() => subtractUtcDays(todayMeta, 1), [todayMeta]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const todayAnchor = utcTodayParts();
      setTodayMeta(todayAnchor);
      const res = await fetch(`/api/history?days=7&today=${encodeURIComponent(todayAnchor)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = (await res.json().catch(() => ({}))) as { rollups?: DailyHistoryRollup[]; today?: string; error?: string };
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to load history");
      setRollups(Array.isArray(j.rollups) ? j.rollups : []);
    } catch (e) {
      setRollups([]);
      setErr(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, refreshKey]);

  function dateLabel(day: string) {
    if (day === yesterday) {
      try {
        const d = new Date(`${day}T12:00:00.000Z`);
        const human = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
        return `Yesterday (${human})`;
      } catch {
        return "Yesterday";
      }
    }
    try {
      const d = new Date(`${day}T12:00:00.000Z`);
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
    } catch {
      return day;
    }
  }

  const hasAnyMeals = rollups.some((r) => r.meal_count > 0);

  return (
    <section className="calorai-enter calorai-enter-delay-2 mt-6 rounded-[var(--calorai-radius-card)] border border-[var(--calorai-border)] bg-white p-5 shadow-[var(--calorai-shadow-sm)]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--calorai-text-secondary)]">History</h2>
      <p className="mt-1 text-sm text-[var(--calorai-text-secondary)]">
        Last seven days before today. Tap a day to jump to its meals (UTC calendar).
      </p>

      {loading ? (
        <p className="mt-6 py-8 text-center text-sm text-[var(--calorai-text-secondary)]">Loading…</p>
      ) : err ? (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--calorai-border)] bg-calorai-bg px-4 py-3 text-sm text-[var(--calorai-error)]">{err}</p>
      ) : !hasAnyMeals ? (
        <p className="mt-6 py-10 text-center text-sm text-[var(--calorai-text-secondary)]">
          No history yet. Keep logging meals to see summaries here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--calorai-border)]">
          {rollups
            .filter((row) => row.meal_count > 0)
            .map((row) => {
            const { tone, label } = statusForCalories(row.total_calories, calorieGoal);
            const w = pct(row.total_calories, calorieGoal);
            const fmtMacro = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
            return (
              <li key={row.date}>
                <button
                  type="button"
                  onClick={() => onSelectDay(row.date)}
                  className="flex w-full flex-col gap-3 rounded-xl py-5 text-left transition hover:bg-calorai-bg first:pt-4 active:scale-[0.995]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-semibold text-[var(--calorai-text)]">{dateLabel(row.date)}</span>
                    <span className="tabular-nums text-sm font-semibold text-[var(--calorai-text)]">
                      {Math.round(row.total_calories)}{" "}
                      <span className="font-medium text-[var(--calorai-text-secondary)]">/ {Math.round(calorieGoal)} kcal</span>
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden>
                    <div className={`cal-macro-fill h-full rounded-full ${barTone(tone)}`} style={{ width: `${w}%` }} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                    <span className={`font-semibold tabular-nums ${tone === "ok" ? "text-calorai-success" : tone === "low" ? "text-calorai-warning" : "text-[var(--calorai-error)]"}`}>
                      {label}
                    </span>
                  </div>
                  <div className="tabular-nums text-xs text-[var(--calorai-text-secondary)]">
                    P:{" "}
                    <span className="font-semibold text-[var(--calorai-text)]">
                      {fmtMacro(row.total_protein)}g
                    </span>{" "}
                    · F:{" "}
                    <span className="font-semibold text-[var(--calorai-text)]">
                      {fmtMacro(row.total_fat)}g
                    </span>{" "}
                    · C:{" "}
                    <span className="font-semibold text-[var(--calorai-text)]">
                      {fmtMacro(row.total_carbs)}g
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
