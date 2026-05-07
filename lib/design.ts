export const COLORS = {
  primary: "#007AFF",
  success: "#00C853",
  warning: "#FF9500",
  error: "#FF3B30",
  background: "#F8F9FA",
  card: "#FFFFFF",
  textPrimary: "#000000",
  textSecondary: "#666666",
  border: "#E5E5EA",
} as const;

export const SHADOWS = {
  sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
  md: "0 4px 16px rgba(0, 0, 0, 0.12)",
  lg: "0 20px 60px rgba(0, 0, 0, 0.15)",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const TYPOGRAPHY = {
  display: { fontSize: 32, fontWeight: 700 },
  h1: { fontSize: 28, fontWeight: 700 },
  h2: { fontSize: 24, fontWeight: 600 },
  body: { fontSize: 16, fontWeight: 400 },
  caption: { fontSize: 14, fontWeight: 400 },
  label: { fontSize: 12, fontWeight: 500 },
} as const;

export const TRANSITIONS = {
  base: "0.3s ease-in-out",
} as const;

