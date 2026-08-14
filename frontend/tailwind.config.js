/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 地图深色主题（参考 PRD §3.1.1）
        map: {
          bg: '#0a1628',
          panel: '#0f1e33',
          border: '#1e3350',
          accent: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
}
