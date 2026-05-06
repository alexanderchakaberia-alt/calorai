"use client";

import {
  ACTIVITY_MULTIPLIERS,
  lbsToKg,
  inchesHeightToCm,
  cmToFeetInches,
  computeSmartGoals,
} from "@/lib/nutrition-calculator";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const LS_KEY = "calorai-goals-complete";

const ACTIVITY_OPTIONS = [
  { key: "sedentary", label: "Sedentary (little/no exercise)", multiplier: ACTIVITY_MULTIPLIERS.sedentary },
  { key: "light", label: "Lightly active (1–3 days/week)", multiplier: ACTIVITY_MULTIPLIERS.light },
  { key: "moderate", label: "Moderately active (3–5 days/week)", multiplier: ACTIVITY_MULTIPLIERS.moderate },
  { key: "very_active", label: "Very active (6–7 days/week)", multiplier: ACTIVITY_MULTIPLIERS.very_active },
  { key: "extra_active", label: "Extra active (athlete / physical job)", multiplier: ACTIVITY_MULTIPLIERS.extra_active },
];

const GOAL_OPTIONS = [
  { key: "cut", label: "Cut (lose fat)", desc: "20% calorie deficit" },
  { key: "maintain", label: "Maintain", desc: "No deficit / surplus" },
  { key: "lean_bulk", label: "Lean bulk", desc: "10% surplus" },
  { key: "bulk", label: "Bulk", desc: "20% surplus" },
];

function parseNum(v, min, max, fallback = "") {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default function GoalsCalculator({ onSuccess, defaultTab = "manual" }) {
  const [tab, setTab] = useState(defaultTab === "calc" ? "calc" : "manual");

  const [manualCal, setManualCal] = useState("");
  const [manualP, setManualP] = useState("");
  const [manualC, setManualC] = useState("");
  const [manualF, setManualF] = useState("");
  const [manualFiber, setManualFiber] = useState("30");

  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("30");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [weight, setWeight] = useState("75");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("175");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("9");
  const [activity, setActivity] = useState("moderate");
  const [goalType, setGoalType] = useState("maintain");
  const [bodyFat, setBodyFat] = useState("");
  const [useBodyFat, setUseBodyFat] = useState(false);

  const [result, setResult] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** null until mounted — avoids hydration mismatch */
  const [wizardDone, setWizardDone] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setWizardDone(localStorage.getItem(LS_KEY) === "1");
    }
  }, []);

  const weightKg = useMemo(() => {
    const w = parseFloat(weight);
    if (!Number.isFinite(w)) return NaN;
    return weightUnit === "lbs" ? lbsToKg(w) : w;
  }, [weight, weightUnit]);

  const heightCmResolved = useMemo(() => {
    if (heightUnit === "cm") {
      const h = parseFloat(heightCm);
      return Number.isFinite(h) ? h : NaN;
    }
    const ft = parseFloat(heightFt);
    const inch = parseFloat(heightIn);
    if (!Number.isFinite(ft) || !Number.isFinite(inch)) return NaN;
    return inchesHeightToCm(ft, inch);
  }, [heightUnit, heightCm, heightFt, heightIn]);

  const runCalculate = useCallback(() => {
    setSaveMsg(null);
    const ageN = parseNum(age, 15, 100, NaN);
    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
      setResult({ error: "Enter a valid weight (≈30–300 kg equivalent)." });
      return;
    }
    if (!Number.isFinite(heightCmResolved) || heightCmResolved < 100 || heightCmResolved > 250) {
      setResult({ error: "Enter a valid height (≈100–250 cm or use ft/in)." });
      return;
    }
    if (!Number.isFinite(ageN)) {
      setResult({ error: "Enter a valid age (15–100)." });
      return;
    }

    const bf =
      useBodyFat && bodyFat.trim() !== ""
        ? parseNum(bodyFat, 5, 50, NaN)
        : null;
    if (useBodyFat && (!Number.isFinite(bf) || bf < 5 || bf > 50)) {
      setResult({ error: "Body fat should be between 5% and 50%." });
      return;
    }

    try {
      const out = computeSmartGoals({
        sex,
        ageYears: ageN,
        weightKg,
        heightCm: heightCmResolved,
        activityKey: activity,
        goalKey: goalType,
        bodyFatPercent: useBodyFat && Number.isFinite(bf) ? bf : undefined,
      });

      if (!Number.isFinite(out.bmr) || !Number.isFinite(out.targetCalories)) {
        setResult({ error: "Could not compute — check inputs." });
        return;
      }

      setResult({ ok: true, ...out });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Calculation failed." });
    }
  }, [
    age,
    weightKg,
    heightCmResolved,
    activity,
    goalType,
    sex,
    bodyFat,
    useBodyFat,
  ]);

  const resetCalcForm = () => {
    setSex("male");
    setAge("30");
    setWeightUnit("kg");
    setWeight("75");
    setHeightUnit("cm");
    setHeightCm("175");
    setHeightFt("5");
    setHeightIn("9");
    setActivity("moderate");
    setGoalType("maintain");
    setBodyFat("");
    setUseBodyFat(false);
    setResult(null);
    setSaveMsg(null);
  };

  const resetManual = () => {
    setManualCal("");
    setManualP("");
    setManualC("");
    setManualF("");
    setManualFiber("30");
    setSaveMsg(null);
  };

  async function saveGoals(payload) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Save failed.");
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY, "1");
        setWizardDone(true);
      }
      setSaveMsg({ type: "ok", text: "Goals saved. Your tracker will use these targets." });
      onSuccess?.();
    } catch (e) {
      setSaveMsg({ type: "err", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function saveManual(e) {
    e.preventDefault();
    const cals = parseFloat(manualCal);
    const p = parseFloat(manualP);
    const c = parseFloat(manualC);
    const f = parseFloat(manualF);
    const fib = parseFloat(manualFiber);
    if (![cals, p, c, f, fib].every((n) => Number.isFinite(n) && n >= 0)) {
      setSaveMsg({ type: "err", text: "Enter valid numbers for all fields." });
      return;
    }
    await saveGoals({
      calorie_goal: Math.round(cals),
      protein_goal: Math.round(p),
      carbs_goal: Math.round(c),
      fat_goal: Math.round(f),
      fiber_goal: Math.round(fib),
    });
  }

  async function saveFromCalc() {
    if (!result?.ok) return;
    await saveGoals({
      calorie_goal: Math.round(result.targetCalories),
      protein_goal: Math.round(result.proteinG),
      carbs_goal: Math.round(result.carbsG),
      fat_goal: Math.round(result.fatG),
      fiber_goal: Math.round(result.fiberG),
    });
  }

  const syncHeightUnits = (toCm) => {
    if (toCm) {
      const cm = heightCmResolved;
      if (Number.isFinite(cm)) {
        const { feet, inches } = cmToFeetInches(cm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
      setHeightUnit("cm");
    } else {
      const cm = heightCmResolved;
      if (Number.isFinite(cm)) setHeightCm(String(Math.round(cm)));
      setHeightUnit("ftin");
    }
  };

  const onboardingBanner = mounted && wizardDone === false;

  return (
    <div
      className={
        onboardingBanner
          ? "mb-6 rounded-2xl border-2 border-violet-300 bg-violet-50/80 p-4 sm:p-6 shadow-sm"
          : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      {onboardingBanner ? (
        <p className="mb-3 text-sm font-semibold text-violet-900">Set your daily goals to unlock the full tracker</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "manual" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          I know my goals
        </button>
        <button
          type="button"
          onClick={() => setTab("calc")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "calc" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Calculate for me
        </button>
      </div>

      {saveMsg ? (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            saveMsg.type === "ok" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"
          }`}
        >
          {saveMsg.text}
        </div>
      ) : null}

      {tab === "manual" ? (
        <form onSubmit={saveManual} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your macro targets directly. Fiber is included for wellness tracking (general guideline: ~25–38 g/day).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Daily calories (kcal)
              <input
                type="number"
                inputMode="numeric"
                min={800}
                max={10000}
                required
                value={manualCal}
                onChange={(e) => setManualCal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Protein (g)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={500}
                required
                value={manualP}
                onChange={(e) => setManualP(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Carbs (g)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={1000}
                required
                value={manualC}
                onChange={(e) => setManualC(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Fat (g)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={500}
                required
                value={manualF}
                onChange={(e) => setManualF(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Fiber (g) — default ~25–35
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={80}
                value={manualFiber}
                onChange={(e) => setManualFiber(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save goals"}
            </button>
            <button
              type="button"
              onClick={resetManual}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Sex</legend>
              <div className="mt-1 flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="sex" checked={sex === "male"} onChange={() => setSex("male")} />
                  Male
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="sex" checked={sex === "female"} onChange={() => setSex("female")} />
                  Female
                </label>
              </div>
            </fieldset>
            <label className="block text-sm font-medium text-slate-700">
              Age (years)
              <input
                type="number"
                min={15}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className="text-sm font-medium text-slate-700">Weight</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={weightUnit === "kg" ? 30 : 66}
                  max={weightUnit === "kg" ? 300 : 660}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-700">Height</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => syncHeightUnits(true)}
                className={`rounded px-2 py-1 text-xs ${heightUnit === "cm" ? "bg-slate-800 text-white" : "bg-slate-100"}`}
              >
                cm
              </button>
              <button
                type="button"
                onClick={() => syncHeightUnits(false)}
                className={`rounded px-2 py-1 text-xs ${heightUnit === "ftin" ? "bg-slate-800 text-white" : "bg-slate-100"}`}
              >
                ft / in
              </button>
            </div>
            {heightUnit === "cm" ? (
              <input
                type="number"
                inputMode="decimal"
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="mt-2 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
                placeholder="cm"
              />
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min={3}
                  max={8}
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="ft"
                />
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="in"
                />
              </div>
            )}
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Activity level
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="mt-1 w-full max-w-lg rounded-lg border border-slate-200 px-3 py-2"
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} (×{o.multiplier})
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Goal</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((g) => (
                <label
                  key={g.key}
                  className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm ${
                    goalType === g.key ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input type="radio" name="goalType" checked={goalType === g.key} onChange={() => setGoalType(g.key)} />
                    <span className="font-semibold">{g.label}</span>
                  </div>
                  <span className="ml-6 text-xs text-slate-500">{g.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={useBodyFat} onChange={(e) => setUseBodyFat(e.target.checked)} />
              Use body fat % (Katch–McArdle BMR instead of Mifflin–St Jeor)
            </label>
            {useBodyFat ? (
              <input
                type="range"
                min={5}
                max={50}
                value={bodyFat || "18"}
                onChange={(e) => setBodyFat(e.target.value)}
                className="mt-2 w-full max-w-md"
              />
            ) : null}
            {useBodyFat ? (
              <div className="mt-1 text-sm text-slate-600">{bodyFat || "18"}% body fat</div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runCalculate}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Calculate
            </button>
            <button
              type="button"
              onClick={resetCalcForm}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </div>

          {result?.error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{result.error}</div>
          ) : null}

          {result?.ok ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="text-lg font-bold text-slate-900">Your targets</h3>
              <p className="mt-1 text-3xl font-black tracking-tight text-violet-700">{Math.round(result.targetCalories)} kcal</p>
              <p className="text-sm text-slate-600">per day</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <strong>Protein:</strong> {result.proteinG} g ({result.proteinPct}% kcal)
                </li>
                <li>
                  <strong>Carbs:</strong> {result.carbsG} g ({result.carbsPct}% kcal)
                </li>
                <li>
                  <strong>Fat:</strong> {result.fatG} g ({result.fatPct}% kcal)
                </li>
                <li>
                  <strong>Fiber:</strong> {result.fiberG} g
                </li>
              </ul>
              <div className="mt-4 rounded-lg bg-white/80 p-3 text-xs text-slate-600 ring-1 ring-slate-100">
                <p>
                  <abbr title="Basal Metabolic Rate" className="cursor-help font-semibold text-slate-800">
                    BMR
                  </abbr>{" "}
                  ≈ {result.bmr} kcal/day — energy your body uses at complete rest.
                </p>
                <p className="mt-1">
                  <abbr title="Total Daily Energy Expenditure" className="cursor-help font-semibold text-slate-800">
                    TDEE
                  </abbr>{" "}
                  ≈ {result.tdee} kcal/day — estimated maintenance including activity.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveFromCalc()}
                className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving…" : "Save these goals"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
