/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Papel e tinta — base da identidade editorial.
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
        // Vermelho-lacre: ações principais e destaques de pré-venda.
        seal: { 900: '#4A150C', 800: '#6B1F11', 700: '#8C2F1B', 600: '#A63A22', 500: '#C24A2C', 100: '#F6E3DC', 50: '#FBF1ED' },
        // Verde-floresta: estados positivos.
        leaf: { 800: '#1F4A36', 700: '#2A6148', 600: '#357A5B', 100: '#DDEEE4' },
        gilt: { 600: '#9A7A2E', 500: '#B8923A', 100: '#F4EAD2' },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { page: '76rem' },
      boxShadow: {
        book: '0 1px 1px rgba(18,17,15,0.08), 0 12px 28px -12px rgba(18,17,15,0.35)',
        'book-lg': '0 2px 2px rgba(18,17,15,0.08), 0 30px 60px -24px rgba(18,17,15,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up 0.5s ease-out both' },
    },
  },
  plugins: [],
};
