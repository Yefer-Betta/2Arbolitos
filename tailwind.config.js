/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A4D2E', // Deep Forest Green
          light: '#2D6A42',
          dark: '#113520',
        },
        secondary: {
          DEFAULT: '#D4A373', // Earthy Gold/Ochre
          light: '#E5C09C',
        },
        background: {
          DEFAULT: '#F9F7F2', // Soft Cream
          paper: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#F0EBE0', // Slightly darker cream for cards/sidebars
        }
      }
    },
  },
  plugins: [],
}
