"use client";

import React from "react";

export default function PortionAdjuster({
  grams,
  baselineGrams,
  onGramsChange,
  disabled,
}) {
  const step = 10;
  const g = Number(grams);
  const safe = Number.isFinite(g) ? Math.max(1, g) : 1;
  const base = Number(baselineGrams) > 0 ? Number(baselineGrams) : safe;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portion (g)</span>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onGramsChange(Math.max(1, safe - step))}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            aria-label="Decrease portion"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            disabled={disabled}
            value={Math.round(safe)}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (Number.isFinite(n)) onGramsChange(Math.max(1, n));
            }}
            className="w-16 border-0 bg-transparent text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onGramsChange(safe + step)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            aria-label="Increase portion"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[0.5, 1, 1.5, 2].map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onGramsChange(Math.max(1, Math.round(base * m)))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-violet-50 hover:border-violet-300 disabled:opacity-40"
          >
            {m === 1 ? "1×" : `${m}×`}
          </button>
        ))}
      </div>
    </div>
  );
}
