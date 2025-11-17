/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        trust: {
          low: '#ef4444',     // red-500
          medium: '#eab308',  // yellow-500
          high: '#22c55e',    // green-500
        },
      },
    },
  },
  plugins: [],
};
