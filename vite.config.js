// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Removed duplicate export default to fix multiple default exports error


export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/' : '/',
  build: {
    outDir: 'dist-v3'
  } 
}))