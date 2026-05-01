// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import AstroPWA from '@vite-pwa/astro';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: parseInt(process.env.WEB_PORT || '4321', 10),
    host: true
  },
  integrations: [
    react(),
    AstroPWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Ahorcado en familia',
        short_name: 'Ahorcado',
        description: 'Juego del ahorcado multijugador en tiempo real para celulares',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        theme_color: '#0f172a',
        background_color: '#0b1120',
        categories: ['games', 'entertainment'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,svg,png,ico,webp,woff2}'],
        navigateFallback: '/offline',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/socket\.io\//,
          /^\/health/
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\/(assets|icons|_astro)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname === '/categories',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-categories',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => /^\/sessions\/[^/]+$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-session',
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => /^\/sessions\/[^/]+\/leaderboard$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-leaderboard',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/socket.io/'),
            handler: 'NetworkOnly'
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/health'),
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: '/offline'
      },
      experimental: {
        directoryAndTrailingSlashHandler: true
      }
    })
  ],

  vite: {
    // El `.env` vive en la raíz del monorepo (compartido con la API).
    // Por default Vite buscaría en `apps/web/`, así que lo apuntamos a la
    // raíz para que `import.meta.env.PUBLIC_*` se inyecte correctamente.
    envDir: '../../',
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@ahorcado/shared']
    }
  }
});
