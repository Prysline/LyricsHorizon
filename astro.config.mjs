// @ts-check
import { defineConfig } from 'astro/config';
import typescript from "@astrojs/typescript";

// https://astro.build/config
export default defineConfig({
  integrations: [typescript()],
  compilerOptions: {
    strict: true,
    strictNullChecks: true,
  },
});
