/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ffffff',
        accent: '#3f3f46',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bgSoft: '#0a0a0a',
        card: '#18181b'
      }
    },
  },
  plugins: [],
}
