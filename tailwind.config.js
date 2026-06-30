/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // Modo oscuro por clase (3.1): nativewind `colorScheme.set()` la maneja en
  // ambas plataformas. Los valores viven como CSS variables en global.css.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta Cauce — tonos serenos, bajo contraste agresivo.
        // Los valores son triplets RGB en variables (global.css) para que
        // TODA la app cambie de tema sin tocar cada className, y los
        // modificadores de opacidad (text-ink/70) sigan funcionando.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)", // cards (ex bg-white)
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        river: {
          50: "rgb(var(--c-river-50) / <alpha-value>)",
          100: "rgb(var(--c-river-100) / <alpha-value>)",
          300: "rgb(var(--c-river-300) / <alpha-value>)",
          500: "rgb(var(--c-river-500) / <alpha-value>)",
          700: "rgb(var(--c-river-700) / <alpha-value>)",
          900: "rgb(var(--c-river-900) / <alpha-value>)",
        },
        sand: {
          DEFAULT: "rgb(var(--c-sand) / <alpha-value>)",
          500: "rgb(var(--c-sand) / <alpha-value>)",
        },
        alert: "rgb(var(--c-alert) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
