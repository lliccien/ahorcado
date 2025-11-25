// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';

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
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});