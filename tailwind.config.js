/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1C2526',
          50: '#E8EAEB',
          100: '#D1D6D7',
          200: '#A3ACAE',
          300: '#758386',
          400: '#47595D',
          500: '#1C2526',
          600: '#161E1F',
          700: '#101617',
          800: '#0B0F10',
          900: '#050708',
        },
        accent: {
          red: '#E63946',
          yellow: '#F4A261',
          pink: '#F4A6A9',
          teal: '#457B9D',
          brown: '#3C2F2F',
        },
        surface: {
          white: '#F5F5F5',
          light: '#FFFFFF',
          dark: '#1C2526',
        },
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E63946, #F4A261)',
        'gradient-secondary': 'linear-gradient(90deg, #F4A6A9, #457B9D)',
        'gradient-dark': 'linear-gradient(135deg, #1C2526, #3C2F2F)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')",
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(230, 57, 70, 0.3)',
        'glow-yellow': '0 0 20px rgba(244, 162, 97, 0.3)',
        'glow-teal': '0 0 20px rgba(69, 123, 157, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#1C2526',
            lineHeight: '1.75',
          },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};