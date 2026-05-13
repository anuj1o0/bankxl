/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#0a0d14',
        surface: '#111622',
        surface2: '#171e2e',
        accent: {
          DEFAULT: '#00e5a0',
          dim: 'rgba(0,229,160,0.12)',
          glow: 'rgba(0,229,160,0.25)',
        },
        muted: '#7a8499',
        dim: '#3d4558',
      },
    },
  },
  plugins: [],
}
