/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
        panelLight: '#1e293b',
        accent: '#38bdf8',
      },
    },
  },
  plugins: [],
};
