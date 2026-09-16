import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/MendAdmin/',
  plugins: [react(), tailwindcss()],
  server: {
    // Dev/QA convenience: the console is often opened through a LAN host or a
    // container/proxy URL (which Vite's host check would otherwise block).
    allowedHosts: true,
  },
})
