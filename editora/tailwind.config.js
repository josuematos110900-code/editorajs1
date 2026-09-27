/** @type {import('tailwindcss').Config} */

// Tokens semânticos: os valores vivem em src/index.css (:root) como
// variáveis CSS — é aí que se muda a identidade visual. Os componentes
// usam estes nomes (primary, surface, muted…) em vez de cores soltas.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: token('primary'), hover: token('primary-hover'), soft: token('primary-soft') },
        secondary: { DEFAULT: token('secondary'), hover: token('secondary-hover') },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') },
        background: token('background'),
        surface: { DEFAULT: token('surface'), alt: token('surface-alt') },
        fg: token('text'),
        muted: token('muted'),
        line: { DEFAULT: token('border'), strong: token('border-strong') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },

        // Escalas de apoio (sombras de cor para capas geradas, gráficos, etc.).
        paper: { DEFAULT: '#F7F3EC', 50: '#FCFAF6', 100: '#F7F3EC', 200: '#EDE6DA', 300: '#DDD3C2' },
        ink: {
          950: '#12110F',
          900: '#1C1A17',
          800: '#2A2723',
          700: '#3D3934',
          600: '#57524A',
          500: '#6F695F',
          400: '#8F887C',
          300: '#B5AEA2',
          200: '#D6D0C5',
          100: '#ECE7DE',
        },
        seal: { 900: '#4A150C', 800: '#6B1F11', 700: '#8C2F1B', 600: '#A63A22', 500: '#C24A2C', 100: '#F6E3DC', 50: '#FBF1ED' },
        leaf: { 800: '#1F4A36', 700: '#2A6148', 600: '#357A5B', 100: '#DDEEE4' },
        gilt: { 600: '#8A6A1F', 500: '#B8923A', 100: '#F4EAD2' },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { page: '76rem', prose: '42rem' },
      boxShadow: {
        book: '0 1px 1px rgba(18,17,15,0.08), 0 12px 28px -12px rgba(18,17,15,0.35)',
        'book-lg': '0 2px 2px rgba(18,17,15,0.08), 0 30px 60px -24px rgba(18,17,15,0.45)',
      },
      borderRadius: { card: '0.625rem' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'slide-in': 'slide-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
