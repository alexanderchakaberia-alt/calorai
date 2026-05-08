"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnalyzingOverlay from "@/components/AnalyzingOverlay";
import FoodItemCard from "@/components/FoodItemCard";
import { scaleMacrosFromGrams } from "@/lib/portion-scale";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEditableFromItem(it) {
  const grams = Math.max(1, Math.round(Number(it.portion_grams) || 100));
  return {
    id: newId(),
    food_name: String(it.food_name || "").trim() || "Food",
    portion_display: String(it.portion_display || "").trim() || `${grams} g`,
    grams,
    calories: Math.round(Number(it.calories) || 0),
    protein: round1(Number(it.protein) || 0),
    fat: round1(Number(it.fat) || 0),
    carbs: round1(Number(it.carbs) || 0),
    fiber: round1(Number(it.fiber) || 0),
    confidence: Math.min(100, Math.max(0, Math.round(Number(it.confidence) || 0))),
    ai_food_name: String(it.food_name || "").trim(),
    ai_grams: grams,
    ai_calories: Math.round(Number(it.calories) || 0),
    ai_protein: round1(Number(it.protein) || 0),
    ai_fat: round1(Number(it.fat) || 0),
    ai_carbs: round1(Number(it.carbs) || 0),
    ai_fiber: round1(Number(it.fiber) || 0),
    ai_confidence: Math.min(100, Math.max(0, Math.round(Number(it.confidence) || 0))),
  };
}

function createManualItem() {
  return {
    id: newId(),
    food_name: "",
    portion_display: "",
    grams: 100,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    confidence: 100,
    ai_food_name: null,
    ai_grams: null,
    ai_calories: null,
    ai_protein: null,
    ai_fat: null,
    ai_carbs: null,
    ai_fiber: null,
    ai_confidence: null,
  };
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function meanConfidence(items) {
  if (!items.length) return 0;
  const nums = items.map((i) => Number(i.confidence) || 0).filter((n) => n >= 0);
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sumTotals(items) {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.calories) || 0),
      protein: acc.protein + (Number(it.protein) || 0),
      fat: acc.fat + (Number(it.fat) || 0),
      carbs: acc.carbs + (Number(it.carbs) || 0),
      fiber: acc.fiber + (Number(it.fiber) || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
  );
}

export default function CameraCapture({
  onMealLogged,
  logDate,
  calorieGoal = 2000,
  dayCaloriesBeforeMeal = 0,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const analyzeAbortRef = useRef(null);

  const [step, setStep] = useState("start");
  const [tipsVisible, setTipsVisible] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [parseWarning, setParseWarning] = useState(null);
  const [photoQualityNote, setPhotoQualityNote] = useState(null);
  const [mealSummary, setMealSummary] = useState("");
  const [items, setItems] = useState([]);
  const [logging, setLogging] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [libraryFoods, setLibraryFoods] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [manualFood, setManualFood] = useState({ name: "", cal: "", p: "", f: "", c: "", fib: "" });
  const [barcodeBusy, setBarcodeBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (analyzeAbortRef.current) {
        try {
          analyzeAbortRef.current.abort();
        } catch {
          // noop
        }
        analyzeAbortRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function scanBarcodePrompt() {
    if (barcodeBusy) return;
    const code = (window.prompt("Enter barcode") || "").trim();
    if (!code) return;

    setBarcodeBusy(true);
    try {
      const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(code)}&source=openfoodfacts`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      const foods = j?.foods || [];
      if (!res.ok || !foods.length) {
        setAnalysisError("Barcode not found. Try another code.");
        setStep("error");
        return;
      }

      const f = foods[0];
      const it = createEditableFromItem({
        food_name: f.name,
        portion_grams: 100,
        portion_display: "100 g",
        calories: f.calories,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        fiber: f.fiber,
        confidence: 100,
      });

      setCapturedImage(null);
      setParseWarning(null);
      setPhotoQualityNote(null);
      setMealSummary("Scanned product");
      setItems([it]);
      setStep("review");
    } catch {
      setAnalysisError("Barcode scan failed. Try again.");
      setStep("error");
    } finally {
      setBarcodeBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "camera" || !tipsVisible) return undefined;
    const t = setTimeout(() => setTipsVisible(false), 3000);
    return () => clearTimeout(t);
  }, [step, tipsVisible]);

  useEffect(() => {
    if (step !== "review" || !addOpen) return;
    void (async () => {
      try {
        const res = await fetch("/api/past-foods", { credentials: "include", headers: { Accept: "application/json" } });
        const j = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(j.items)) setLibraryFoods(j.items);
      } catch {
        setLibraryFoods([]);
      }
    })();
  }, [step, addOpen]);

  useEffect(() => {
    if (successInfo) {
      const t = setTimeout(() => {
        setSuccessInfo(null);
        resetToStart();
      }, 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [successInfo]);

  function resetToStart() {
    setStep("start");
    setCameraActive(false);
    setCapturedImage(null);
    setAnalysisError(null);
    setParseWarning(null);
    setPhotoQualityNote(null);
    setMealSummary("");
    setItems([]);
    setTipsVisible(true);
    setAddOpen(false);
    if (analyzeAbortRef.current) {
      try {
        analyzeAbortRef.current.abort();
      } catch {
        // noop
      }
      analyzeAbortRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleRetake() {
    // Do not stop the camera stream. Just clear analysis + go back to live view.
    if (analyzeAbortRef.current) {
      try {
        analyzeAbortRef.current.abort();
      } catch {
        // noop
      }
      analyzeAbortRef.current = null;
    }
    setCapturedImage(null);
    setAnalysisError(null);
    setParseWarning(null);
    setPhotoQualityNote(null);
    setMealSummary("");
    setItems([]);
    setTipsVisible(true);
    setAddOpen(false);
    setStep("camera");
    setCameraActive(true);
  }

  async function startCamera() {
    setAnalysisError(null);
    setParseWarning(null);
    try {
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "[::1]");
      if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost) {
        throw new Error("Camera requires a secure context. Open the app via http://localhost (not a LAN IP).");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser.");
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setStep("camera");
    } catch (e) {
      let message = e?.message || "Failed to start camera.";
      if (e?.name === "NotAllowedError") {
        message = "Camera access denied. Please allow camera access in your browser settings.";
      } else if (e?.name === "NotFoundError") {
        message = "No camera found on this device.";
      } else if (e?.name === "NotReadableError") {
        message = "Camera is already in use by another application.";
      }
      setAnalysisError(message);
      setCameraActive(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [cameraActive]);

  const runAnalyze = useCallback(
    async (imageBase64) => {
      setAnalysisError(null);
      setParseWarning(null);
      setPhotoQualityNote(null);
      if (analyzeAbortRef.current) {
        try {
          analyzeAbortRef.current.abort();
        } catch {
          // noop
        }
      }
      const controller = new AbortController();
      analyzeAbortRef.current = controller;

      let res;
      try {
        res = await fetch("/api/analyze-food", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
          signal: controller.signal,
        });
      } catch (e) {
        if (e?.name === "AbortError") return; // user cancelled
        throw e;
      } finally {
        analyzeAbortRef.current = null;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Analysis failed. Please try again.");
      if (data.parse_warning) setParseWarning(data.parse_warning);
      if (data.photo_quality_note) setPhotoQualityNote(data.photo_quality_note);

      const rawItems = Array.isArray(data.items) ? data.items : [];
      if (rawItems.length === 0) {
        setParseWarning(
          data.parse_warning ||
            "Couldn't identify any food in this image. Try taking a clearer photo with better lighting."
        );
        setItems([]);
        setMealSummary(typeof data.meal_summary === "string" ? data.meal_summary : "");
        setStep("review");
        return;
      }

      setItems(rawItems.map((it) => createEditableFromItem(it)));
      setMealSummary(
        typeof data.meal_summary === "string" && data.meal_summary.trim()
          ? data.meal_summary.trim()
          : rawItems.map((x) => x.food_name).join(", ")
      );
      setStep("review");
    },
    []
  );

  async function capturePhoto() {
    setAnalysisError(null);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error("Camera not ready.");
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) throw new Error("Camera is not ready yet.");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to capture photo.");
      ctx.drawImage(video, 0, 0, w, h);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageBase64);
      // Keep stream running so user can retake instantly.
      setCameraActive(true);
      setStep("analyzing");
      await runAnalyze(imageBase64);
    } catch (e) {
      setAnalysisError(e?.message || "Analysis failed. Please try again.");
      setStep("error");
    }
  }

  function handleGramsChange(id, newGrams) {
    const g = Math.max(1, Math.round(Number(newGrams) || 1));
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (it.ai_grams == null || it.ai_grams <= 0) {
          return { ...it, grams: g };
        }
        const scaled = scaleMacrosFromGrams(it.ai_grams, g, {
          calories: it.ai_calories,
          protein: it.ai_protein,
          fat: it.ai_fat,
          carbs: it.ai_carbs,
          fiber: it.ai_fiber ?? 0,
        });
        return {
          ...it,
          grams: g,
          calories: scaled.calories,
          protein: scaled.protein,
          fat: scaled.fat,
          carbs: scaled.carbs,
          fiber: scaled.fiber,
        };
      })
    );
  }

  function updateItem(id, next) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addManualBlank() {
    setItems((prev) => [...prev, createManualItem()]);
    setAddOpen(false);
  }

  function addFromLibrary(entry) {
    const grams = 100;
    const it = {
      id: newId(),
      food_name: entry.food_name,
      portion_display: entry.portion || `${grams} g`,
      grams,
      calories: Math.round(Number(entry.calories) || 0),
      protein: round1(Number(entry.protein) || 0),
      fat: round1(Number(entry.fat) || 0),
      carbs: round1(Number(entry.carbs) || 0),
      fiber: 0,
      confidence: 100,
      ai_food_name: null,
      ai_grams: null,
      ai_calories: null,
      ai_protein: null,
      ai_fat: null,
      ai_carbs: null,
      ai_fiber: null,
      ai_confidence: null,
    };
    setItems((prev) => [...prev, it]);
    setAddOpen(false);
  }

  function submitManualQuick() {
    const cals = parseFloat(manualFood.cal);
    const p = parseFloat(manualFood.p);
    const f = parseFloat(manualFood.f);
    const cb = parseFloat(manualFood.c);
    const fib = parseFloat(manualFood.fib || "0");
    const name = manualFood.name.trim();
    if (!name || !Number.isFinite(cals)) return;
    const it = {
      id: newId(),
      food_name: name,
      portion_display: "manual",
      grams: 100,
      calories: Math.round(cals),
      protein: Number.isFinite(p) ? round1(p) : 0,
      fat: Number.isFinite(f) ? round1(f) : 0,
      carbs: Number.isFinite(cb) ? round1(cb) : 0,
      fiber: Number.isFinite(fib) ? round1(fib) : 0,
      confidence: 100,
      ai_food_name: null,
      ai_grams: null,
      ai_calories: null,
      ai_protein: null,
      ai_fat: null,
      ai_carbs: null,
      ai_fiber: null,
      ai_confidence: null,
    };
    setItems((prev) => [...prev, it]);
    setManualFood({ name: "", cal: "", p: "", f: "", c: "", fib: "" });
    setAddOpen(false);
  }

  async function confirmLog() {
    if (!logDate) {
      setAnalysisError("Missing date — refresh the page.");
      return;
    }
    const totals = sumTotals(items);
    if (items.length === 0 || totals.calories <= 0) {
      setAnalysisError("Add at least one food item with calories.");
      return;
    }

    setLogging(true);
    setAnalysisError(null);
    try {
      const mealItems = items.map((it) => ({
        food_name: it.food_name.trim(),
        portion: it.portion_display?.trim() || null,
        calories: Math.max(0, Math.round(Number(it.calories) || 0)),
        protein: Math.max(0, Number(it.protein) || 0),
        fat: Math.max(0, Number(it.fat) || 0),
        carbs: Math.max(0, Number(it.carbs) || 0),
        fiber: Math.max(0, Number(it.fiber) || 0),
        ai_food_name: it.ai_food_name,
        ai_calories: it.ai_calories,
        ai_protein: it.ai_protein,
        ai_fat: it.ai_fat,
        ai_carbs: it.ai_carbs,
        ai_confidence: it.ai_confidence,
      }));

      const res = await fetch("/api/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ date: logDate, items: mealItems }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to log meal.");

      const addedCals = Math.round(totals.calories);
      const newDay = Math.round(dayCaloriesBeforeMeal + addedCals);
      const goal = Math.max(1, Math.round(Number(calorieGoal) || 2000));
      setSuccessInfo({
        addedCals,
        newDay,
        goal,
      });
      onMealLogged?.();
      setStep("success");
    } catch (e) {
      setAnalysisError(e?.message || "Failed to log meal.");
    } finally {
      setLogging(false);
    }
  }

  const overall = useMemo(() => meanConfidence(items), [items]);
  const totals = useMemo(() => sumTotals(items), [items]);

  return (
    <div className="w-full max-w-xl mx-auto">
      {analysisError && step !== "camera" && step !== "analyzing" ? (
        <div className="mb-3 rounded-xl border border-black/[0.08] bg-calorai-bg px-3 py-2.5 text-sm text-[#636366] shadow-sm">
          {analysisError}
          {step === "error" && capturedImage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnalysisError(null);
                  setStep("analyzing");
                  void (async () => {
                    try {
                      await runAnalyze(capturedImage);
                    } catch (e) {
                      setAnalysisError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
                      setStep("error");
                    }
                  })();
                }}
                className="rounded-lg bg-calorai-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === "success" && successInfo ? (
        <div className="rounded-2xl border border-calorai-success/25 bg-calorai-success/10 px-4 py-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-calorai-success text-3xl text-white shadow-lg">
            ✓
          </div>
          <p className="mt-4 text-lg font-bold text-[#1C1C1E]">Meal logged</p>
          <p className="mt-2 text-sm text-[#636366]">
            {successInfo.addedCals.toLocaleString()} cal added — you&apos;re at{" "}
            <span className="font-bold">{successInfo.newDay.toLocaleString()}</span> / {successInfo.goal.toLocaleString()}{" "}
            for today
          </p>
        </div>
      ) : null}

      {step === "start" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={startCamera}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Start camera
          </button>
          <button
            type="button"
            disabled={barcodeBusy}
            onClick={() => void scanBarcodePrompt()}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {barcodeBusy ? "Scanning…" : "Scan barcode"}
          </button>
        </div>
      ) : null}

      {step === "camera" ? (
        <div>
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-inner"
            onClick={() => setTipsVisible(false)}
            role="presentation"
          >
            <video ref={videoRef} playsInline muted className="h-64 w-full object-cover sm:h-80" />
            {tipsVisible ? (
              <div className="pointer-events-none absolute left-0 right-0 top-0 bg-black/35 px-3 py-2 text-center">
                <p className="text-[11px] font-medium text-white/95">Center the food in frame · Good lighting helps</p>
                <p className="text-[11px] text-white/90">Include the full plate</p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={capturePhoto}
            className="mt-3 w-full min-h-[48px] rounded-xl bg-calorai-primary px-4 py-3.5 text-sm font-bold text-white shadow-card transition hover:opacity-95 active:scale-[0.99]"
          >
            Capture &amp; analyze
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : null}

      {step === "analyzing" && capturedImage ? (
        <div className="space-y-3">
          <AnalyzingOverlay imageSrc={capturedImage} />
          <button type="button" onClick={handleRetake} className="w-full text-center text-xs font-semibold text-slate-600 hover:opacity-80">
            Cancel
          </button>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-4">
          {capturedImage ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={capturedImage}
                  alt="Captured meal"
                  className="h-20 w-20 rounded-xl object-cover ring-2 ring-slate-200 shadow-sm"
                />
                <div className="text-xs text-slate-600">
                  <button type="button" onClick={handleRetake} className="font-semibold text-slate-700 hover:opacity-80">
                    Retake
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Meal name</span>
            <input
              type="text"
              value={mealSummary}
              onChange={(e) => setMealSummary(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Overall confidence</span>
              <span className="font-bold text-slate-900">{Math.round(overall)}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-calorai-primary transition-all"
                style={{ width: `${Math.min(100, overall)}%` }}
              />
            </div>
          </div>

          {overall < 70 && items.length > 0 ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
              ⚠ Some items may be inaccurate. Please review and edit before logging.
            </div>
          ) : null}
          {overall >= 80 && items.length > 0 ? (
            <div className="rounded-xl border border-calorai-success/30 bg-calorai-success/10 px-3 py-2 text-sm font-medium text-[#1C1C1E]">
              ✓ Analysis looks good!
            </div>
          ) : null}

          {parseWarning ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">{parseWarning}</div>
          ) : null}
          {photoQualityNote ? (
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200">
              Photo: {photoQualityNote}
              <span className="mt-1 block text-xs text-slate-600">Consider retaking with better lighting or focus.</span>
            </div>
          ) : null}

          <div className="space-y-3">
            {items.map((it) => (
              <FoodItemCard
                key={it.id}
                item={it}
                disabled={logging}
                onChange={(next) => updateItem(it.id, next)}
                onGramsChange={(g) => handleGramsChange(it.id, g)}
                onRemove={() => removeItem(it.id)}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="text-sm font-semibold text-calorai-primary hover:opacity-80"
            >
              + Add another item
            </button>
            {addOpen ? (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addManualBlank}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
                  >
                    Empty row (edit all)
                  </button>
                </div>
                {libraryFoods.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Food library</p>
                    <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
                      {libraryFoods.slice(0, 12).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => addFromLibrary(f)}
                          className="flex w-full justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-calorai-primary/5"
                        >
                          <span className="font-medium text-slate-800">{f.food_name}</span>
                          <span className="text-slate-500">{Math.round(f.calories)} kcal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="Name"
                    value={manualFood.name}
                    onChange={(e) => setManualFood((s) => ({ ...s, name: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Calories"
                    inputMode="numeric"
                    value={manualFood.cal}
                    onChange={(e) => setManualFood((s) => ({ ...s, cal: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Protein g"
                    inputMode="decimal"
                    value={manualFood.p}
                    onChange={(e) => setManualFood((s) => ({ ...s, p: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Fat g"
                    inputMode="decimal"
                    value={manualFood.f}
                    onChange={(e) => setManualFood((s) => ({ ...s, f: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Carbs g"
                    inputMode="decimal"
                    value={manualFood.c}
                    onChange={(e) => setManualFood((s) => ({ ...s, c: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Fiber g"
                    inputMode="decimal"
                    value={manualFood.fib}
                    onChange={(e) => setManualFood((s) => ({ ...s, fib: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitManualQuick}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Add manual entry
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Totals</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <div>
                <span className="text-slate-500">Cal</span>
                <div className="font-bold text-slate-900">{Math.round(totals.calories)}</div>
              </div>
              <div>
                <span className="text-slate-500">P</span>
                <div className="font-bold">{round1(totals.protein)} g</div>
              </div>
              <div>
                <span className="text-slate-500">F</span>
                <div className="font-bold">{round1(totals.fat)} g</div>
              </div>
              <div>
                <span className="text-slate-500">C</span>
                <div className="font-bold">{round1(totals.carbs)} g</div>
              </div>
              <div>
                <span className="text-slate-500">Fiber</span>
                <div className="font-bold">{round1(totals.fiber)} g</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={logging}
              onClick={confirmLog}
              className="flex-1 min-h-[48px] rounded-xl bg-calorai-primary px-4 py-3 text-sm font-bold text-white shadow-card transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            >
              {logging ? "Logging…" : "Confirm & log meal"}
            </button>
            <button
              type="button"
              disabled={logging}
              onClick={handleRetake}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
            >
              📷 Retake Photo
            </button>
          </div>
        </div>
      ) : null}

      {step === "error" && capturedImage ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Analysis failed. Please try again.</p>
          <button
            type="button"
            onClick={() => {
              setAnalysisError(null);
              setStep("analyzing");
              void (async () => {
                try {
                  await runAnalyze(capturedImage);
                } catch (e) {
                  setAnalysisError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
                  setStep("error");
                }
              })();
            }}
            className="w-full min-h-[48px] rounded-xl bg-calorai-primary py-3 text-sm font-bold text-white shadow-card"
          >
            Retry analysis
          </button>
          <button type="button" onClick={resetToStart} className="w-full text-sm font-semibold text-slate-600">
            Cancel
          </button>
        </div>
      ) : null}

      {step === "analyzing" ? (
        <p className="mt-2 text-center text-xs text-slate-500">Working on your photo…</p>
      ) : null}
    </div>
  );
}
