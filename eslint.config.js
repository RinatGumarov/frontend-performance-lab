import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/coverage/**',
      '**/dist/**',
      '**/dist-pages/**',
      '**/playwright-report/**',
      '**/storybook-static/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  reactHooks.configs.flat.recommended,
  {
    ...reactRefresh.configs.vite,
    files: ['apps/lab/**/*.{js,jsx,ts,tsx}'],
  },
  {
    files: ['**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { roles: ['rowgroup'] },
      ],
    },
  },
);
