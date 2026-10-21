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
        // Superficies y texto: apuntan a variables CSS para que el modo oscuro
        // cambie en un solo lugar (ver src/index.css).
        background: {
          DEFAULT: 'var(--app-bg)',
          paper: 'var(--app-surface)',
        },
        surface: {
          DEFAULT: 'var(--app-surface-2)',
        },
        ink: {
          DEFAULT: 'var(--app-ink)',
          strong: 'var(--app-ink-strong)',
          muted: 'var(--app-ink-muted)',
          soft: 'var(--app-ink-soft)',
          brand: 'var(--app-ink-brand)',
        },
        line: {
          DEFAULT: 'var(--app-line)',
          soft: 'var(--app-line-soft)',
        },
        // Estados con par texto/fondo
        ok: {
          DEFAULT: 'var(--app-ok)',
          soft: 'var(--app-ok-soft)',
        },
        warn: {
          DEFAULT: 'var(--app-warn)',
          soft: 'var(--app-warn-soft)',
        },
        danger: {
          DEFAULT: 'var(--app-danger)',
          soft: 'var(--app-danger-soft)',
        },
        info: {
          DEFAULT: 'var(--app-info)',
          soft: 'var(--app-info-soft)',
        },
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04)',
        pop: '0 16px 40px -16px rgb(16 24 40 / 0.25)',
      },
    },
  },
  plugins: [],
}
