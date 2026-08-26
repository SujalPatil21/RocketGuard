/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system from RocketGuard Design.md
        background:    '#E4EBF5',   // Primary app background — pale blue-gray
        surfaceLight:  '#D2E2F9',   // Secondary light surface — KPI cards
        surfaceWhite:  '#F9FBFD',   // Near-white — controls, inputs
        surfaceDark:   '#323232',   // Primary dark — workspace, nav pill
        surfaceDark2:  '#525353',   // Secondary dark — dark cards
        detailPanel:   '#849FB0',   // Selected transaction panel — muted blue-gray
        softBlueGray:  '#9DB1BF',   // Soft blue-gray secondary surfaces

        // Text
        primaryText:   '#17191B',
        secondaryText: '#596168',

        // Accent
        lime:          '#DDF625',   // Signature lime/chartreuse accent

        // Semantic fraud colors
        critical:      '#F04B4B',
        highRisk:      '#F28A45',
        medium:        '#E9C84A',
        lowRisk:       '#7DBF9A',
        neutral:       '#92999F',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        'card':      '24px',
        'workspace': '28px',
        'card-md':   '18px',
        'pill':      '9999px',
      },
      boxShadow: {
        'card':    '0 8px 30px rgba(35, 50, 65, 0.07)',
        'float':   '0 4px 16px rgba(35, 50, 65, 0.06)',
        'deep':    '0 16px 48px rgba(35, 50, 65, 0.10)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.2s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
