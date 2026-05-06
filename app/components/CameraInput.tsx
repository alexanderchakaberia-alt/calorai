"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

type AnalyzeResult = {
  food_name?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  portion?: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Invalid image encoding result."));
      resolve(result); // data:image/...;base64,...
    };
    reader.readAsDataURL(file);
  });
}

export function CameraInput({
  disabled,
  isAnalyzing,
  onImageCapture,
  onAnalyze,
}: {
  disabled?: boolean;
  isAnalyzing?: boolean;
  onImageCapture: (imageBase64: string | null) => void;
  onAnalyze: (imageBase64: string) => Promise<AnalyzeResult | void> | AnalyzeResult | void;
}) {
  const inputId = useId();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const canAnalyze = useMemo(() => !!imageBase64 && !disabled && !isAnalyzing, [imageBase64, disabled, isAnalyzing]);

  function stopStream() {
    const s = streamRef.current;
    if (s) {
      for (const t of s.getTracks()) t.stop();
    }
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopStream();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setPreviewUrl(null);
      setImageBase64(null);
      onImageCapture(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      e.target.value = "";
      return;
    }

    try {
      // Create preview URL (revoked on next selection)
      const nextPreview = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextPreview;
      });

      const b64 = await fileToBase64(file);
      setImageBase64(b64);
      onImageCapture(b64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image.");
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImageBase64(null);
      onImageCapture(null);
    }
  }

  async function openCamera() {
    setError(null);

    // Prefer true camera (desktop + mobile) if available.
    const canGetUserMedia =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (!canGetUserMedia) {
      // Fallback: file input with capture attribute (mostly works on mobile).
      cameraInputRef.current?.click();
      return;
    }

    setCameraOpen(true);
    setCameraStarting(true);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not access the camera. Please allow camera permissions or choose a file.";
      setError(msg);
      setCameraOpen(false);
      stopStream();
      cameraInputRef.current?.click();
    } finally {
      setCameraStarting(false);
    }
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraStarting(false);
    stopStream();
  }

  function capturePhoto() {
    setError(null);
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture photo.");
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImageBase64(dataUrl);
    onImageCapture(dataUrl);
    setPreviewUrl(dataUrl); // data URL works directly in <img src=...>
    closeCamera();
  }

  async function handleAnalyze() {
    if (!imageBase64 || disabled || isAnalyzing) return;
    setError(null);
    try {
      await onAnalyze(imageBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Photo (Phase 2)</div>
          <div className="mt-0.5 text-sm text-slate-600">Take a photo or choose an image to prepare for AI recognition.</div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      <div className="mt-3">
        <div className="text-sm font-medium text-slate-700">Add a photo</div>

        {/* Hidden inputs so we can offer two explicit options */}
        <input
          ref={cameraInputRef}
          id={`${inputId}-camera`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled || isAnalyzing}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          id={`${inputId}-file`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isAnalyzing}
          className="hidden"
        />

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center">
          <button
            type="button"
            disabled={disabled || isAnalyzing}
            onClick={() => void openCamera()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use camera
          </button>

          <button
            type="button"
            disabled={disabled || isAnalyzing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Choose file
          </button>

          <div className="text-xs text-slate-500 sm:text-sm">
            Tip: You may be prompted to allow camera access.
          </div>

          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={!canAnalyze}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                Analyzing...
              </>
            ) : (
              "Analyze with AI"
            )}
          </button>
        </div>
      </div>

      {cameraOpen ? (
        <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Camera</div>
            <button
              type="button"
              onClick={closeCamera}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-[240px] w-full object-cover sm:h-[320px]"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {cameraStarting ? "Starting camera..." : "Frame your meal and capture a photo."}
            </div>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={cameraStarting}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Take photo
            </button>
          </div>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-slate-600">Preview</div>
          <div className="mt-2 flex items-center gap-3">
            <img
              src={previewUrl}
              alt="Selected meal preview"
              className="h-[200px] w-[200px] rounded-lg object-cover ring-1 ring-black/10"
            />
            <div className="text-sm text-slate-600">
              {imageBase64 ? (
                <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5">
                  <div className="text-xs font-semibold text-slate-700">Image ready</div>
                  <div className="mt-1 text-xs text-slate-500">Base64 prepared for upload.</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

