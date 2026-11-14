/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effcf9",
          100: "#d1f7ee",
          500: "#0d9488",
          600: "#0f766e",
          700: "#115e59",
        },
      },
    },
  },
  plugins: [],
};
