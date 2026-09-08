/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#17212b', paper: '#f7f8fa', line: '#e3e7eb', coral: '#e76f51', teal: '#e00909' },
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'sans-serif'], display: ['DM Sans', 'ui-sans-serif', 'sans-serif'] },
      boxShadow: { panel: '0 18px 48px rgba(23, 33, 43, 0.07)' },
    },
  },
  plugins: [],
}