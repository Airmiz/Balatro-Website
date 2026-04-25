/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0b0d12',
          800: '#12151d',
          700: '#1a1f2a',
          600: '#242b39',
          500: '#2e3647',
        },
        accent: {
          red: '#ff4d5e',
          blue: '#4da3ff',
          gold: '#ffcb49',
          green: '#5ad18a',
          purple: '#b07dff',
        },
        suit: {
          hearts: '#ff4d5e',
          diamonds: '#ff9a3c',
          clubs: '#5ad18a',
          spades: '#4da3ff',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
