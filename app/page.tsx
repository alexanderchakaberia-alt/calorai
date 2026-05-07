"use client";

import { CalorieTracker } from "@/app/components/CalorieTracker";
import { Show, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import React from "react";

export default function Page() {
  const { user } = useUser();
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "there";

  return (
    <div className="min-h-screen bg-slate-50">
      <Show when="signed-out">
        <div className="mx-auto max-w-lg px-4 py-16">
          <header className="mb-10 text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Calorie Tracker</h1>
            <p className="mt-3 text-slate-600">Sign in to track meals with AI.</p>
          </header>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <SignInButton>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type="button"
                className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 sm:w-auto"
              >
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <CalorieTracker displayName={displayName} />
      </Show>
    </div>
  );
}
