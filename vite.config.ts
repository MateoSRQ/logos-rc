import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 6321,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:6322',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '') || '/',
      },
    },
  },
})
