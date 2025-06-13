/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "custom-red": "#c30011",
        "custom-yellow": "#ffc536",
        "custom-gray": "#585858",
      },
    },
  },
  fontFamily: {
    sans: ['"Roboto"', "sans-serif"],
  },
  plugins: [],
};
