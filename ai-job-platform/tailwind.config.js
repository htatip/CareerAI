
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        ink: "#0A0A0F",
        paper: "#F5F3EE",
        accent: "#C8F135",
        muted: "#6B6B7B",
        surface: "#13131A",
        border: "#1E1E2E",
      },
    },
  },
  plugins: [],
};