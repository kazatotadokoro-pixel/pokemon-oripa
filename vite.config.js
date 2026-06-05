import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { maximumFileSizeToCacheInBytes: 5000000 },
      includeAssets: ['icon.webp'],
      manifest: {
        name: 'オリパラック',
        short_name: 'オリパラック',
        description: 'ポケモンオリパ販売サイト',
        theme_color: '#0d47a1',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon.webp', sizes: '192x192', type: 'image/webp' },
          { src: '/icon.webp', sizes: '512x512', type: 'image/webp' },
          { src: '/icon.webp', sizes: '512x512', type: 'image/webp', purpose: 'any maskable' }
        ]
      }
    })
  ]
})