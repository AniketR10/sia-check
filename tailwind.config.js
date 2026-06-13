/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sia-inspired palette
        sia: {
          green: '#19fb6b',
          dark: '#0b0f14',
          panel: '#12181f',
          border: '#1f2933',
          muted: '#7b8a99',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
