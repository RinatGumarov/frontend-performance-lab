import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@riguran/render-observer/react',
        replacement: fileURLToPath(
          new URL(
            '../../packages/render-observer/src/react.tsx',
            import.meta.url,
          ),
        ),
      },
      {
        find: '@riguran/render-observer',
        replacement: fileURLToPath(
          new URL(
            '../../packages/render-observer/src/index.ts',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
