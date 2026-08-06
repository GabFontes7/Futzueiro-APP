import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'brand/logo-futzueiro.png',
        'brand/icon-192.png',
        'brand/icon-512.png',
        'cartas/default.png',
      ],
      manifest: {
        name: 'Futzueiro App',
        short_name: 'Futzueiro',
        description: 'Organize rachas de futebol — Futzueiro Futebol Clube',
        theme_color: '#07070a',
        background_color: '#07070a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/brand/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/brand/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Online-first: não cacheia API; só shell estático
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
