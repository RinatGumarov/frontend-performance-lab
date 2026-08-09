/// <reference types="vite/client" />

import type { RenderSnapshot } from '@riguran/render-observer';

declare global {
  interface Window {
    __RENDER_LAB__: {
      reset(): void;
      snapshot(): RenderSnapshot;
    };
  }
}

export {};
