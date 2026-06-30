/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B3954',
        teal: '#087E8B',
        lightblue: '#DCEEF2',
      },
    },
  },
  plugins: [],
};
