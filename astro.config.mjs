import process from 'node:process'
import tailwind from '@astrojs/tailwind'
// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site:
    process.env.NODE_ENV === 'production' ? 'https://prysline.github.io' : 'http://localhost:4321',
  base: process.env.NODE_ENV === 'production' ? '/LyricsHorizon' : '/LyricsHorizon',
  integrations: [tailwind()],
  compilerOptions: {
    strict: true,
    strictNullChecks: true,
  },
  build: {
    format: 'preserve',
  },
})
