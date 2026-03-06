import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        semantic: {
          tightening: {
            fg: "#fca5a5",
            border: "#f87171",
            bg: "#3f1a1a"
          },
          easing: {
            fg: "#86efac",
            border: "#4ade80",
            bg: "#123023"
          },
          unchanged: {
            fg: "#cbd5e1",
            border: "#64748b",
            bg: "#162133"
          },
          caution: {
            fg: "#fcd34d",
            border: "#f59e0b",
            bg: "#3b2d0b"
          },
          reversal: {
            fg: "#fda4af",
            border: "#fb7185",
            bg: "#3c1420"
          }
        },
        slate: {
          950: "#0a0d14"
        }
      }
    }
  },
  plugins: []
};

export default config;
