# @riguran/render-observer

A small, typed observer for collecting structural React performance evidence. It tracks render counts, mounted collection sizes, Profiler commits, and frame-gap samples without coupling the measurement store to React.

The package is used by the [Frontend Performance Lab](https://github.com/riguran/frontend-performance-lab) to make baseline and optimized rendering strategies directly comparable.

## Installation

```bash
pnpm add @riguran/render-observer
```

React 18 or 19 is required only when using the `/react` entry point.

## Core observer

```ts
import { createRenderObserver } from '@riguran/render-observer';

const observer = createRenderObserver({
  mode: 'optimized',
  datasetSize: 100_000,
});

const unsubscribe = observer.subscribe(() => {
  console.table(observer.getSnapshot());
});

observer.markRender('dashboard');
observer.setMountedItems('trade-rows', 42);

unsubscribe();
```

Snapshots are immutable and retain their reference when a setter receives semantically unchanged data. This makes them safe to consume with `useSyncExternalStore`.

## React adapters

```tsx
import { createRenderObserver } from '@riguran/render-observer';
import {
  RenderProfiler,
  useRenderMarker,
  useRenderSnapshot,
} from '@riguran/render-observer/react';

const observer = createRenderObserver();

function Dashboard() {
  useRenderMarker(observer, 'dashboard');
  const snapshot = useRenderSnapshot(observer);

  return <output>{snapshot.renders.dashboard ?? 0}</output>;
}

export function InstrumentedDashboard() {
  return (
    <RenderProfiler id="dashboard" observer={observer}>
      <Dashboard />
    </RenderProfiler>
  );
}
```

`useRenderMarker` records committed renders from a layout effect. It does not mutate the observer during React render.

## Frame sampling

`startFrameSample` accepts an injected scheduler, so browser `requestAnimationFrame` sampling remains deterministic in tests:

```ts
import { startFrameSample } from '@riguran/render-observer';

const cancel = startFrameSample({
  scheduler: {
    request: requestAnimationFrame,
    cancel: cancelAnimationFrame,
  },
  frameCount: 60,
  gapThresholdMs: 32,
  onComplete: console.log,
});

// Cancel if the measured interaction ends early.
cancel();
```

## Scope

This package deliberately observes existing application behavior. It is not a state manager, benchmark runner, or replacement for the React Profiler and browser performance tools.

## License

MIT
