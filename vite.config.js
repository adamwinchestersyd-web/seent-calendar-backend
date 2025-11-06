// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Removed duplicate export default to fix multiple default exports error


export default defineConfig(({ command }) => ({
  plugins: [react()],
  // When running `vite`/`npm run dev` keep base at '/',
  // but when building for cPanel subfolder /seent/, point assets there.
  base: command === 'build' ? '/seent/' : '/',
}))