/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#080B10',
        surface: '#0F141B',
        elevated: '#151B23',
        border: '#222A35',
        primaryText: '#F4F7FA',
        secondaryText: '#929CAB',
        muted: '#626C7A',
        primaryAccent: '#7180FF',
        safe: '#36D399',
        warning: '#F4B740',
        danger: '#FF5C5C',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
