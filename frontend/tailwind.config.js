/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#08090C', // deep obsidian black canvas
          900: '#0E1116', // sleek dark charcoal card surface
          850: '#14171F', // elevated secondary container
          800: '#1C202B', // neutral charcoal border & interactive container
          750: '#252A38', // elevated pill / hover state
          700: '#313747', // subtle separators / icons
        },
        slate: {
          950: '#08090C', // true deep black canvas
          900: '#0E1116', // sleek dark charcoal card surface
          850: '#14171F', // secondary elevated container
          800: '#1C202B', // neutral charcoal borders & pills
          750: '#252A38', // active/hover elements
          700: '#313747', // subtle separators
          600: '#52596C', // secondary muted text
          500: '#7C8497', // labels & category headers
          400: '#9EA6B8', // body secondary text
          300: '#CBD1DF', // body primary text in dark mode
          200: '#E4E7EE', // light text in dark mode / light borders
          100: '#F1F3F7',
          50: '#F8F9FA',
        },
        charcoal: {
          950: '#08090C',
          900: '#0E1116',
          850: '#14171F',
          800: '#1C202B',
          750: '#252A38',
          700: '#313747',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro"',
          'Inter',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'SFMono-Regular',
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -2px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'rise': 'rise 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.2s ease-out both',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}


