import { createRenderObserver } from '@riguran/render-observer';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './app/App.tsx';

const observer = createRenderObserver();

window.__RENDER_LAB__ = {
  reset: () => observer.reset(),
  snapshot: () => observer.getSnapshot(),
};

createRoot(document.getElementById('root')!).render(<App observer={observer} />);
