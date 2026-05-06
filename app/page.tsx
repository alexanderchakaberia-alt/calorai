"use client";

import CameraCapture from "@/components/CameraCapture";
import React from "react";

export default function Page() {
  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Calorie Tracker</h1>
      <CameraCapture />
    </div>
  );
}

