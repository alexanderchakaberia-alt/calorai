"use client";

import { CalorieTracker } from "@/app/components/CalorieTracker";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import React from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-calorai-bg">
      <Show when="signed-out">
        <div className="mx-auto max-w-lg px-4 py-16">
          <header className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-calorai-primary">Welcome</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1C1C1E]">CalorAI</h1>
            <p className="mt-3 text-[#636366]">Sign in to track meals with intelligence.</p>
          </header>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SignInButton>
              <button
                type="button"
                className="w-full rounded-2xl border border-black/[0.08] bg-white px-5 py-3.5 text-sm font-semibold text-[#1C1C1E] shadow-card transition hover:shadow-card-hover active:scale-[0.99] sm:w-auto"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type="button"
                className="w-full rounded-2xl bg-calorai-primary px-5 py-3.5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 active:scale-[0.99] sm:w-auto"
              >
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <CalorieTracker />
      </Show>
    </div>
  );
}
