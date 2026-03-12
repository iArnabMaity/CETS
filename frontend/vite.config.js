import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // Forces IPv4
    port: 3000,        // Switches to a completely fresh port
    strictPort: true,
    open: true         // Forces your browser to auto-open the exact correct link
  }
})