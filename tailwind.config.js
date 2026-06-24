/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palette carried over from the original KWM dashboard.
        bg: "#1a1d27",
        panel: "#222533",
        card: "#262a39",
        border: "#2a2d3a",
        ink: "#e5e7eb",
        muted: "#9ca3af",
        faint: "#6b7280",
        brand: "#3b82f6",
        warn: "#f59e0b",
        danger: "#ef4444",
        good: "#22c55e",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
