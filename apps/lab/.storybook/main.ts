import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(viteConfig, { configType }) {
    return mergeConfig(viteConfig, {
      base:
        configType === 'PRODUCTION'
          ? '/frontend-performance-lab/storybook/'
          : '/',
      build: {
        chunkSizeWarningLimit: 1_500,
      },
      resolve: {
        alias: [
          {
            find: '@riguran/render-observer/react',
            replacement: fileURLToPath(
              new URL(
                '../../../packages/render-observer/src/react.tsx',
                import.meta.url,
              ),
            ),
          },
          {
            find: '@riguran/render-observer',
            replacement: fileURLToPath(
              new URL(
                '../../../packages/render-observer/src/index.ts',
                import.meta.url,
              ),
            ),
          },
        ],
      },
    });
  },
};

export default config;
