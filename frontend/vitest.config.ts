import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Polyfill markAsUncloneable for older Node versions (Node < 21.2) before jsdom / undici load
try {
  const workerThreads = require('node:worker_threads');
  if (typeof workerThreads.markAsUncloneable !== 'function') {
    workerThreads.markAsUncloneable = (val: unknown) => val;
  }
} catch {
  // Ignore in environments where require is not available
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    execArgv: ['--require', path.resolve(__dirname, './vitest-preload.cjs')],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
