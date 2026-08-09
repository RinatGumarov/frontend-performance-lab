# @riguran/render-observer

A small typed observer for collecting structural rendering evidence. Its framework-free core tracks named render counts, mounted collection sizes, React Profiler commits, context, and animation-frame samples. React integration is available through a separate peer-dependent subpath.

The package powers the [Frontend Performance Lab](https://github.com/rinatgumarov/frontend-performance-lab), where the same snapshot feeds visible metrics and browser-level assertions.

## Installation

```bash
npm install @riguran/render-observer
```

Install React 18 or 19 only when using `@riguran/render-observer/react`.

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
observer.recordCommit(3.4);

unsubscribe();
observer.reset();
```

Snapshots are immutable. Setters that receive semantically unchanged context, mounted-item totals, or frame samples do not notify subscribers. `reset()` clears measurements and preserves context by default; pass `{ preserveContext: false }` to clear it as well.

Always retain and call the function returned by `subscribe` when the consumer owns the subscription lifecycle.

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

`useRenderSnapshot` uses `useSyncExternalStore` and handles subscription cleanup. `useRenderMarker` records after a committed render from a layout effect; it does not update the observer during React render. `RenderProfiler` forwards React Profiler commit durations to the observer when the active React build supports profiling.

## Frame sampling and scheduler injection

```ts
import { startFrameSample } from '@riguran/render-observer';

const cancel = startFrameSample({
  scheduler: {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  },
  frameCount: 60,
  gapThresholdMs: 32,
  onComplete: (sample) => console.table(sample),
  onError: (error) => console.error(error),
});

window.addEventListener('pagehide', cancel, { once: true });
```

Injecting the scheduler keeps the core module free of browser-global reads and makes the sampler deterministic in tests. Call `cancel()` when the measured interaction or owning lifecycle ends early.

## Runtime support

- ESM only; CommonJS `require()` is not exported.
- Node.js 20 or newer for core observer use.
- Modern browsers for application use.
- React `>=18 <20` as an optional peer requirement for the `/react` entry point.
- `requestAnimationFrame` is not accessed automatically; browser consumers provide it through the scheduler.

## Limitations

- This is an in-memory observer, not telemetry, persistent analytics, or a state manager.
- Render counters describe instrumented boundaries, not every JavaScript operation.
- React Profiler callbacks depend on the React build; production builds without profiling support can report zero commits.
- Frame gaps are local observations affected by the browser, machine, and concurrent work.
- The package does not define universal duration thresholds or run benchmarks by itself.

## License

MIT
