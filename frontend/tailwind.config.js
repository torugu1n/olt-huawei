/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7ff",
          200: "#bfd1ff",
          300: "#92b0ff",
          400: "#6289ff",
          500: "#4568f4",
          600: "#334ed6",
          700: "#2c40b2",
          800: "#27388f",
          900: "#222f72",
          950: "#161d46",
        },
        ink: {
          50: "#f6f7fb",
          100: "#eceef5",
          200: "#d8dce8",
          300: "#b6bfd3",
          400: "#8f9bb7",
          500: "#6f7d9a",
          600: "#596681",
          700: "#49536a",
          800: "#32394b",
          900: "#171b24",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 22px 54px -28px rgba(17, 24, 39, 0.28)",
      },
    },
  },
  plugins: [],
};
