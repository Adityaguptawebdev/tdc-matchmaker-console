import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Restrained plum/indigo accent.
        brand: {
          50: '#f6f4fa',
          100: '#ece7f5',
          200: '#d8cfeb',
          300: '#baaadb',
          400: '#977fc6',
          500: '#7a61b2',
          600: '#644b98',
          700: '#533e7e',
          800: '#453568',
          900: '#3a2e56',
          950: '#241b38',
        },
        canvas: '#f6f5f2',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.06)',
        pop: '0 10px 30px -10px rgba(36, 27, 56, 0.25), 0 4px 10px -4px rgba(36, 27, 56, 0.12)',
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'slide-in': 'slide-in 180ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
