"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
      <p style={{ marginTop: 12, color: "#64748b", lineHeight: 1.5 }}>
        {error.message || "An unexpected error occurred. If this is production, check Vercel env vars (Clerk, Supabase) and deployment logs."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          fontWeight: 700,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
