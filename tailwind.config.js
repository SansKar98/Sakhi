/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'space-navy': {
          50: '#e6e9f0',
          100: '#ccd3e1',
          200: '#99a7c3',
          300: '#667ba5',
          400: '#334f87',
          500: '#0a1929',
          600: '#081424',
          700: '#060f1b',
          800: '#040a12',
          900: '#020509',
        },
        'neon-cyan': {
            50: '#e6fcff',
            100: '#ccf9ff',
            200: '#99f3ff',
            300: '#66edff',
            400: '#33e7ff',
            500: '#00e1ff',
            600: '#00b4cc',
            700: '#008799',
            800: '#005a66',
            900: '#002d33',
        },
        'soft-lavender': {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        'rose-gold': {
            500: '#b76e79',
            400: '#e0bfb8',
        },
        'neon-mint': {
            500: '#3eb489',
            400: '#98ff98',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 225, 255, 0.5)',
        'neon-lavender': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glass': '0 8px 32px 0 rgba( 31, 38, 135, 0.37 )',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe-cyan': 'breathe 4s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'ripple': 'ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 225, 255, 0.2), inset 0 0 20px rgba(0, 225, 255, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 225, 255, 0.6), inset 0 0 40px rgba(0, 225, 255, 0.3)' },
        },
        heartbeat: {
            '0%, 100%': { transform: 'scale(1)', opacity: '1' },
            '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        ripple: {
            '0%': { transform: 'scale(0.9)', opacity: '1' },
            '100%': { transform: 'scale(2)', opacity: '0' },
        },
        float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
