/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A4D2E',
          light: '#2D6A42',
          dark: '#113520',
        },
        secondary: {
          DEFAULT: '#D4A373',
          light: '#E5C09C',
        },
        background: {
          DEFAULT: '#F9F7F2',
          paper: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#F0EBE0',
        }
      }
    },
  },
  plugins: [],
}
