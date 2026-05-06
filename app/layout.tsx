import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CalorAI",
  description: "AI-powered calorie tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

