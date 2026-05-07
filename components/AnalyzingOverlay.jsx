"use client";

import React, { useEffect, useState } from "react";

const PHASES = [
  { beforeMs: 1000, text: "Identifying food items…" },
  { beforeMs: 2000, text: "Estimating portions…" },
  { beforeMs: 3000, text: "Calculating nutrition…" },
  { beforeMs: Infinity, text: "Almost done…" },
];

export default function AnalyzingOverlay({ imageSrc }) {
  const [label, setLabel] = useState(PHASES[0].text);
  const [started] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Date.now() - started;
      const phase = PHASES.find((p) => elapsed < p.beforeMs) ?? PHASES[PHASES.length - 1];
      setLabel(phase.text);
    }, 250);
    return () => clearInterval(t);
  }, [started]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-inner ring-1 ring-slate-700">
      <img src={imageSrc} alt="" className="h-56 w-full object-cover opacity-45 sm:h-72" />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-600/20 via-transparent to-violet-900/35"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 shadow-[0_0_16px_rgba(255,255,255,0.45)] animate-calorai-scan"
        aria-hidden
      />

      <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 p-4 pb-6">
        <div className="flex max-w-[95%] items-center gap-2 rounded-full bg-black/60 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
          <span className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          <span className="text-center leading-snug">{label}</span>
        </div>
      </div>
    </div>
  );
}
