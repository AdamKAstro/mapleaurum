/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1C2526',
          50: '#E8EAEB',
          100: '#D1D6D7',
          200: '#A3ACAE',
          300: '#6b7280', // Added for navy-300
          400: '#475569', // Added for navy-400 (matches rgba(71, 85, 105, 1))
          500: '#1C2526',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        gray: {
          200: '#e5e7eb',
          400: '#9ca3af',
        },
        cyan: {
          400: '#22d3ee',
        },
        emerald: {
          200: '#6ee7b7',
          400: '#34d399', // Added for emerald-400
        },
        amber: {
          400: '#fbbf24', // For status-amber
        },
        blue: {
          400: '#60a5fa', // For status-blue
        },
        red: {
          400: '#f87171', // For error-icon
        },
        surface: {
          white: '#e5e7eb', // Matches gray-200
          light: '#ffffff',
          dark: '#1c2526', // Matches navy-500
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        noise: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ambient-glow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(10%, -10%) scale(1.1)" },
          "66%": { transform: "translate(-10%, 10%) scale(0.9)" },
        },
        "slideDown": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ambient-glow": "ambient-glow 20s ease-in-out infinite",
        "slideDown": "slideDown 0.3s ease-out",
      },
    },
  },
  plugins: [],
};