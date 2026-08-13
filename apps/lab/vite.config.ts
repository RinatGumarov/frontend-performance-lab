import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const observerSource = (entry: string) =>
  fileURLToPath(
    new URL(`../../packages/render-observer/src/${entry}`, import.meta.url),
  );

export default defineConfig({
  base: '/frontend-performance-lab/',
  plugins: [react()],
  resolve: {
    alias: [
      // The deployed build keeps React profiling enabled so the lab can report
      // real commit counts instead of development-only numbers.
      { find: 'react-dom/client', replacement: 'react-dom/profiling' },
      {
        find: '@riguran/render-observer/react',
        replacement: observerSource('react.tsx'),
      },
      {
        find: '@riguran/render-observer',
        replacement: observerSource('index.ts'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
