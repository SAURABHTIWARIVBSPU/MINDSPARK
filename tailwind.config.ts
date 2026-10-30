import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#9f1239",
          600: "#881337",
          700: "#7a0c16",
          800: "#5c000b",
          900: "#3f0006",
        },
        maroon: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#9f1239",
          600: "#881337",
          700: "#7a0c16",
          800: "#5c000b",
          900: "#3f0006",
        },
        portal: {
          maroon: "#7a0c16",
          "maroon-dark": "#5c000b",
          "maroon-light": "#881337",
          gold: "#d97706",
          "gold-light": "#f59e0b",
          "gold-bg": "#fef3c7",
          navy: "#1e3a8a",
          slate: "#0f172a",
          bg: "#f4f6f9",
          border: "#cbd5e1",
        },
      },
    },
  },
  plugins: [],
};
export default config;
