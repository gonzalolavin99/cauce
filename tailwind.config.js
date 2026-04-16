/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Paleta Cauce — tonos serenos, bajo contraste agresivo
        bg: {
          DEFAULT: "#F7F5F2",   // beige muy suave
          dark: "#0F1115",
        },
        ink: {
          DEFAULT: "#1A1F2B",
          dark: "#E8E6E1",
        },
        river: {
          50:  "#EEF5F5",
          100: "#D6E7E7",
          300: "#8FBDBE",
          500: "#4E8B8C",      // primario — azul verdoso calmo
          700: "#2E5F60",
          900: "#193838",
        },
        sand: {
          500: "#C9A875",       // acento cálido
        },
        alert: "#C6553F",       // crisis, sobrio
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};