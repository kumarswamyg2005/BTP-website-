import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'assets',
  server: {
    port: 5173,
    host: true,          // listen on 0.0.0.0 so headsets on the same WiFi can connect
    strictPort: true,
    headers: {
      // Allow any origin to fetch assets (needed when headset browser hits your LAN IP)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      // Tell browsers and video players that range requests are supported
      'Accept-Ranges': 'bytes',
    },
  },
})
