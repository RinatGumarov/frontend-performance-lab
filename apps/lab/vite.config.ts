import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
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
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/storybook-static/**',
            '**/e2e/**',
            '**/*.stories.{ts,tsx}',
          ],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(
              path.dirname(fileURLToPath(import.meta.url)),
              '.storybook',
            ),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
