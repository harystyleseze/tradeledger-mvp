export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14532D",
        leaf: "#16A34A",
        paper: "#FAFAF7",
        charcoal: "#1F2937",
        market: "#D97706",
        rule: "#E5E7EB",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
