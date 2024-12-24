import tailwind from '@astrojs/tailwind';
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site:
    process.env.NODE_ENV === 'production' ? 'https://prysline.github.io' : 'http://localhost:4321',
  base: process.env.NODE_ENV === 'production' ? '/LyricsHorizon' : '/',
  integrations: [tailwind()],
  compilerOptions: {
    strict: true,
    strictNullChecks: true,
  },
});
