/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B1220',
          900: '#111A2E',
          800: '#1A2740',
          700: '#243352',
          600: '#334467',
          500: '#4B5D82',
          400: '#7688AA',
          300: '#A6B4D0',
          200: '#D2DAEC',
          100: '#EAEEF7',
          50: '#F5F7FB',
        },
        brand: {
          950: '#04211D',
          900: '#063A32',
          800: '#0A5548',
          700: '#0E7160',
          600: '#128B76',
          500: '#17A48C',
          400: '#3FC0A6',
          300: '#7DD8C4',
          200: '#B7EBDD',
          100: '#DDF6ED',
          50: '#F1FBF7',
        },
        gold: {
          600: '#B8860B',
          500: '#D4A017',
          400: '#E8BE3F',
          300: '#F3D584',
        },
        coral: {
          600: '#D64545',
          500: '#E85D5D',
          400: '#F18787',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -12px rgba(11,18,32,0.12)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -12px rgba(0,0,0,0.5)',
        ring: '0 0 0 3px rgba(23,164,140,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.97)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
