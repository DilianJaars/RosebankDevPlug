import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        grey: "#6B7280",
        greyLight: "#9CA3AF",
        line: "#E5E7EB",
        lineSoft: "#F3F4F6",
        gradStart: "#2ECC71",
        gradEnd: "#1A73E8",
      },
      borderRadius: { xl2: "12px" },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.06)",
        cardHover: "0 4px 10px rgba(17,24,39,0.06), 0 16px 36px rgba(17,24,39,0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
