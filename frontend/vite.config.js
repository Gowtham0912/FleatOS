import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the local FastAPI backend
      '/api': {
        target: 'https://fleet-backend-5i1b.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'wss://fleet-backend-5i1b.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
