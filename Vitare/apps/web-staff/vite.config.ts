import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: "/monitoramento/",
  server: {
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      // Handshake/polling do Socket.IO e upgrade para WebSocket (gateway NestJS).
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Use custom SW (sw.ts) instead of auto-generated
      registerType: 'autoUpdate',
      // Don't generate SW — we provide our own in public/sw.ts
      // Workbox will still generate precache manifest for our SW to consume
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'apple-icon.png'],
      manifest: {
        name: 'Vitare — Monitoramento',
        short_name: 'Vitare Equipe',
        description: 'Módulo web de monitoramento operacional do Vitare para equipe de saúde',
        theme_color: '#52AF7A',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/monitoramento/',
        start_url: '/monitoramento/',
        id: '/monitoramento/',
        prefer_related_applications: false,
        icons: [
          {
            src: '/monitoramento/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-192x192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/monitoramento/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/monitoramento/icon-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['health', 'medical', 'business'],
        display_override: ['window-controls-overlay', 'standalone', 'browser']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // navigateFallback handled by custom SW
        // navigateFallbackDenylist handled by custom SW
        // runtimeCaching handled by custom SW (only fonts via Workbox)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vitare-web-staff-google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vitare-web-staff-gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
