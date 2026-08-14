import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8220,
    // 开发期将 /api/* 请求代理到后端 FastAPI
    proxy: {
      '/api': {
        target: 'http://localhost:8380',
        changeOrigin: true,
      },
    },
  },
})
