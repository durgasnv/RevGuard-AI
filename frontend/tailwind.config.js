/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#07090e',
          900: '#0c1017',
          850: '#111622',
          800: '#161d2c',
          750: '#1c2538',
          700: '#253047',
        },
        slate: {
          950: '#07090e',
          900: '#0d111a',
          850: '#121824',
          800: '#182030',
          750: '#222d42',
          700: '#313f5c',
          600: '#475a80',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
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


