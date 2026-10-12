import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * vite.config.js – Vite configuration for ErrorSnap AI frontend.
 *
 * The server.proxy block forwards any request starting with /api
 * to the Flask backend running on port 5000.
 * This means API keys stay safely on the server — never in frontend code.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173, // Default Vite port

    proxy: {
      // Any fetch("/api/...") call in React is forwarded to Flask
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
