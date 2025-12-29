/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Lexport Brand Colors
        brand: {
          navy: '#202e46',
          blue: '#529ec6',
          emerald: '#10b981',
        },
        // Primary - Navy tones
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#202e46', // Brand navy
          950: '#102a43',
        },
        // Accent - Blue tones
        accent: {
          50: '#e6f4fa',
          100: '#cce9f5',
          200: '#99d3eb',
          300: '#66bde1',
          400: '#529ec6', // Brand blue
          500: '#4a8fb3',
          600: '#3d7595',
          700: '#305c77',
          800: '#234259',
          900: '#16293b',
        },
        // Success - Emerald tones
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Brand emerald
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(32, 46, 70, 0.08), 0 4px 16px -4px rgba(32, 46, 70, 0.12)',
        'card-hover': '0 4px 12px -2px rgba(32, 46, 70, 0.12), 0 8px 24px -4px rgba(32, 46, 70, 0.16)',
        'button': '0 4px 14px 0 rgba(16, 185, 129, 0.35)',
      },
    },
  },
  plugins: [],
};
