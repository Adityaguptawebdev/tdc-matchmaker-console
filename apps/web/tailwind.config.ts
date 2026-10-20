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
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        // Two people approaching each other from either side.
        'converge-left': {
          from: { opacity: '0', transform: 'translateX(-120px) scale(0.9)' },
          to: { opacity: '1', transform: 'none' },
        },
        'converge-right': {
          from: { opacity: '0', transform: 'translateX(120px) scale(0.9)' },
          to: { opacity: '1', transform: 'none' },
        },
        'heart-pop': {
          '0%': { opacity: '0', transform: 'scale(0.2)' },
          '60%': { opacity: '1', transform: 'scale(1.25)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'heart-float': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.6)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-72px) scale(1)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.18)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.1)' },
        },
        bob: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'dash-flow': { to: { strokeDashoffset: '-24' } },
      },
      animation: {
        'slide-in': 'slide-in 180ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
        'page-in': 'page-in 240ms ease-out both',
        'rise-in': 'rise-in 500ms ease-out both',
        'fade-out': 'fade-out 400ms ease-in both',
        'converge-left': 'converge-left 750ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'converge-right': 'converge-right 750ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'heart-pop': 'heart-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'heart-float': 'heart-float 1.5s ease-out both',
        heartbeat: 'heartbeat 1.8s ease-in-out infinite',
        bob: 'bob 4s ease-in-out infinite',
        'dash-flow': 'dash-flow 1.2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
