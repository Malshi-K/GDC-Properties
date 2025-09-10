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
        "custom-orange": "#f96929",
        "custom-yellow": "#fda24a",
        "custom-blue": "#5e81a1",
      },
    },
  },
  fontFamily: {
    sans: ['"Roboto"', "sans-serif"],
  },
  plugins: [],
};
