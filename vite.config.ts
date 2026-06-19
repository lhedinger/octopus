/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from https://<user>.github.io/octopus/,
// so production assets need the "/octopus/" base. Local dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/octopus/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
