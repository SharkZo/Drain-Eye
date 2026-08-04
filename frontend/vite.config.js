import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://drain-eye-production.up.railway.app'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'DRAIN-EYE - Deteksi Sumbatan Drainase',
          short_name: 'DRAIN-EYE',
          description: 'Sistem deteksi sumbatan drainase & skoring risiko banjir DKI Jakarta',
          start_url: '/upload',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f0f4f8',
          theme_color: '#1F4E79',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          // Cache halaman/JS/CSS statis otomatis (app shell) supaya bisa dibuka walau offline.
          // Untuk data API, pakai NetworkFirst: coba online dulu max 8 detik,
          // kalau gagal/timeout baru pakai data cache terakhir — bukan data kosong.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === apiUrl,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'drain-eye-api-cache',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 hari
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})