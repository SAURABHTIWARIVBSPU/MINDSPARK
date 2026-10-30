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
        // Premium Dark Navy Enterprise Theme Tokens (WCAG 2.2 AA)
        navy: {
          bg: "#101827",          // Main application background
          header: "#172338",      // Primary header
          sidebar: "#141F30",     // Sidebar
          card: "#1C2A3D",        // Main cards
          elevated: "#24344A",    // Dialogs and elevated panels
          softBlue: "#263D59",    // Selected / highlighted surface
          border: "#3B4B60",      // Dividers and outlines
          'border-subtle': "#2A3A4E",
        },
        text: {
          primary: "#F4F7FC",     // Main content
          secondary: "#C2CDDC",   // Supporting content
          muted: "#A7B5C8",       // Metadata
        },
        action: {
          blue: "#78AFFF",        // Primary action / links
          'blue-hover': "#60A5FA",
          'blue-active': "#3B82F6",
          'blue-subtle': "#263D59",
        },
        alert: {
          red: "#F08088",         // Destructive / critical alerts
          'red-hover': "#E06C75",
          'red-subtle': "#3D2428",
        },
        // Apple semantic tokens mapped to dark navy palette
        apple: {
          blue: "#78AFFF",
          "blue-hover": "#60A5FA",
          "blue-active": "#3B82F6",
          "blue-subtle": "#263D59",
          "blue-border": "#3B4B60",
          red: "#F08088",
          "red-hover": "#E06C75",
          "red-active": "#DC2626",
          "red-subtle": "#3D2428",
          "red-border": "#5A2E33",
          ink: "#F4F7FC",
          "ink-muted": "#C2CDDC",
          "ink-subtle": "#A7B5C8",
          canvas: "#1C2A3D",
          parchment: "#101827",
          pearl: "#24344A",
          hairline: "#3B4B60",
          border: "#3B4B60",
        },
        // Legacy portal aliases mapped to dark navy palette for seamless backward compatibility
        portal: {
          maroon: "#78AFFF",
          "maroon-dark": "#172338",
          "maroon-light": "#24344A",
          "maroon-soft": "#263D59",
          gold: "#FBBF24",
          "gold-light": "#FDE68A",
          "gold-bg": "#2B2418",
          navy: "#101827",
          slate: "#1C2A3D",
          bg: "#101827",
          border: "#3B4B60",
        },
      },
      borderRadius: {
        'apple-xs': '5px',
        'apple-sm': '8px',
        'apple-md': '11px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        'apple-pill': '9999px',
      },
      boxShadow: {
        'apple-subtle': '0 1px 2px rgba(0, 0, 0, 0.25)',
        'apple-card': '0 2px 8px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'apple-hover': '0 4px 16px rgba(0, 0, 0, 0.45)',
        'apple-sheet': '0 12px 32px rgba(0, 0, 0, 0.65)',
      },
      letterSpacing: {
        'apple-tight': '-0.022em',
        'apple-headline': '-0.03em',
        'apple-caption': '-0.01em',
      },
    },
  },
  plugins: [],
};
export default config;
