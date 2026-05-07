import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "CaloRAI",
  description: "AI-powered calorie tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-calorai-bg antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
