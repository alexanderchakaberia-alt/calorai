"use client";

import { CalorieTracker } from "@/app/components/CalorieTracker";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import React from "react";

export default function Page() {
  const { user } = useUser();
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "there";

  return (
    <div style={{ padding: "20px", maxWidth: 900, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Calorie Tracker</h1>
          <Show when="signed-in">
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 15 }}>
              Hello, {displayName}
            </p>
          </Show>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Show when="signed-out">
            <SignInButton>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <Show when="signed-out">
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>Sign in to track meals with AI.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <SignInButton>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        {/* Daily goals calculator (onboarding banner until first save) + tracker */}
        <CalorieTracker />
      </Show>
    </div>
  );
}
