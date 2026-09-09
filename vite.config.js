import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base '/Vault/' : l'app est servie sur https://lublubisous.github.io/Vault/
export default defineConfig({
  base: '/Vault/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Vault — Documentation fonctionnelle',
        short_name: 'Vault',
        description:
          'Capture, organise et exploite la connaissance fonctionnelle d\'un logiciel',
        lang: 'fr',
        start_url: '/Vault/',
        scope: '/Vault/',
        display: 'standalone',
        background_color: '#0f1420',
        theme_color: '#0f1420',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
