import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Development configuration without base path
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})