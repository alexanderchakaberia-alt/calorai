"use client";

import React, { useEffect, useRef, useState } from "react";

const colors = {
  bg: "#0b1220",
  card: "#ffffff",
  soft: "#f3f4f6",
  text: "#0f172a",
  muted: "#64748b",
  purple: "#7c3aed",
  purple2: "#4f46e5",
  border: "rgba(15, 23, 42, 0.10)",
  dangerBg: "#fef2f2",
  dangerText: "#b91c1c",
  successBg: "#f0fdf4",
  successText: "#166534",
};

export default function CameraCapture({ onMealLogged }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [food, setFood] = useState(null);
  const [error, setError] = useState(null);
  const [logging, setLogging] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    setError(null);
    setFood(null);
    setLoading(false);

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
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
    } catch (e) {
      setError(e?.message || "Failed to start camera.");
      setCameraActive(false);
    }
  }

  async function capturePhoto() {
    setError(null);
    setLoading(true);
    setFood(null);

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

      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Analyze failed.");

      setFood(data);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    } catch (e) {
      setError(e?.message || "Failed to analyze image.");
    } finally {
      setLoading(false);
    }
  }

  async function logMeal() {
    setError(null);
    setLogging(true);

    try {
      if (!food) throw new Error("No food data to log.");

      const todayISO = new Date().toISOString().split("T")[0];
      const mealData = {
        date: todayISO,
        name: food.food_name,
        calories: Number(food.calories) || 0,
        protein: Number(food.protein) || 0,
        fat: Number(food.fat) || 0,
        carbs: Number(food.carbs) || 0,
      };

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mealData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to log meal.");

      setSuccess(`"${food.food_name}" logged to today's meals!`);
      setFood(null);

      if (onMealLogged) {
        onMealLogged();
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e?.message || "Failed to log meal.");
    } finally {
      setLogging(false);
    }
  }

  function captureAnother() {
    setFood(null);
    setError(null);
    setLoading(false);
    setSuccess(null);
    setCameraActive(false);
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>Food Recognition</div>
            <div style={{ marginTop: 4, fontSize: 14, color: colors.muted }}>
              Take a photo and analyze it with AI.
            </div>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              background: colors.dangerBg,
              color: colors.dangerText,
              border: "1px solid rgba(185, 28, 28, 0.20)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            style={{
              marginTop: 12,
              background: colors.successBg,
              color: colors.successText,
              border: "1px solid rgba(22, 101, 52, 0.20)",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ✓ {success}
          </div>
        ) : null}

        {!cameraActive && !food ? (
          <button
            onClick={startCamera}
            style={{
              width: "100%",
              marginTop: 14,
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 14,
              fontWeight: 800,
              border: `1px solid ${colors.border}`,
              background: "#fff",
              color: colors.text,
            }}
          >
            Start Camera
          </button>
        ) : null}

        {cameraActive ? (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                background: "#000",
                border: `1px solid ${colors.border}`,
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }}
              />
            </div>

            <button
              onClick={capturePhoto}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 12,
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 900,
                border: "0",
                background: `linear-gradient(90deg, ${colors.purple}, ${colors.purple2})`,
                color: "#fff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Analyzing..." : "Capture & Analyze"}
            </button>

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        ) : null}

        {food ? (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                background: colors.soft,
                borderRadius: 16,
                padding: 14,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: colors.text }}>{food.food_name}</div>
              <div style={{ marginTop: 4, fontSize: 14, color: colors.muted }}>{food.portion}</div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <Metric label="Calories" value={food.calories} unit="kcal" />
                <Metric label="Protein" value={food.protein} unit="g" />
                <Metric label="Fat" value={food.fat} unit="g" />
                <Metric label="Carbs" value={food.carbs} unit="g" />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={logMeal}
                  disabled={logging}
                  style={{
                    flex: "1 1 auto",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 900,
                    border: "0",
                    background: "#0f172a",
                    color: "#fff",
                    opacity: logging ? 0.7 : 1,
                    cursor: logging ? "not-allowed" : "pointer",
                    minWidth: "120px",
                  }}
                >
                  {logging ? "Logging..." : "Log This Meal"}
                </button>
                <button
                  onClick={captureAnother}
                  disabled={logging}
                  style={{
                    flex: "1 1 auto",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 900,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                    color: colors.text,
                    cursor: logging ? "not-allowed" : "pointer",
                    opacity: logging ? 0.6 : 1,
                    minWidth: "120px",
                  }}
                >
                  Capture Another
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value, unit }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: colors.text }}>
        {Number.isFinite(Number(value)) ? value : 0}{" "}
        <span style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>{unit}</span>
      </div>
    </div>
  );
}

