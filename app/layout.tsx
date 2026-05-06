import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CalorAI — Nutrition Tracker",
  description: "Track daily calories and macros with SQLite persistence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

