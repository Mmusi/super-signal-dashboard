/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark:    "#0d0d0d",
        panel:   "#111827",
        border:  "#1f2937",
        accent:  "#22c55e",
        danger:  "#ef4444",
        warning: "#f59e0b",
        muted:   "#6b7280",
        bright:  "#f9fafb"
      }
    }
  },
  plugins: []
};
