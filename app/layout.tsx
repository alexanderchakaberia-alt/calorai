import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "CalorAI",
  description: "AI-powered calorie tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

