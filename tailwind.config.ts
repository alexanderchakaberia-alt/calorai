import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        calorai: {
          primary: "#007AFF",
          success: "#34C759",
          warning: "#FF9500",
          bg: "#F5F5F7",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

