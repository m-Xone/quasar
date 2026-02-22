/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0edfe',
          100: '#ddd6fc',
          200: '#c4b5fa',
          300: '#a78bf5',
          400: '#8b6cf0',
          500: '#6c56f0',
          600: '#5a3ed4',
          700: '#4a32b0',
          800: '#3b278d',
          900: '#2d1d6b',
          950: '#1a1040',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        surface: {
          50: '#f8f7fa',
          100: '#f1eff5',
          200: '#e8e5ee',
          300: '#d5d1de',
          400: '#b0a9bf',
          500: '#8b82a0',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '50%': { transform: 'scale(1)', opacity: '0.3' },
          '100%': { transform: 'scale(0.8)', opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 1px 3px rgba(108, 86, 240, 0.06), 0 8px 24px rgba(108, 86, 240, 0.08)',
        'card-hover': '0 4px 12px rgba(108, 86, 240, 0.10), 0 16px 40px rgba(108, 86, 240, 0.14)',
        glow: '0 0 20px rgba(108, 86, 240, 0.25)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
