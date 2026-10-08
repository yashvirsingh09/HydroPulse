/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scada: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#06b6d4',
          warn: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981'
        }
      }
    },
  },
  plugins: [],
}
