# Frontend Performance Lab

A React trade-history dashboard that stays interactive with 100,000 rows, sitting
next to the naive implementation of the same screen so the cost of each
optimization is visible instead of asserted.

[Live demo](https://rinatgumarov.github.io/frontend-performance-lab/) ·
[Investigation notes](docs/investigation.md) ·
[Benchmark evidence](artifacts/performance/latest.md)

[![CI](https://github.com/rinatgumarov/frontend-performance-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/rinatgumarov/frontend-performance-lab/actions/workflows/ci.yml)

## What is being investigated

A trade history screen does two things at once: it lists a large dataset, and it
carries a chart whose crosshair fires pointer events several times per frame.
Written the obvious way, those two things are wired into the same component, so
every pointer move re-renders a subtree that owns thousands of table rows.

The repository reproduces that on purpose, measures it, and then fixes it with
two narrow changes.

## Baseline

`BaselineDashboard` is what you get from writing the feature without thinking
about renders:

- the tooltip snapshot (`visible`, `x`, `y`, `tradeId`, `pnl`) lives in
  `useState` on the dashboard, and the chart pushes into it on every crosshair
  move;
- `BaselineTradeTable` maps the whole trade array into DOM rows.

It is not a strawman — it is about forty lines of unremarkable React. Both modes
share the dataset, the chart adapter, the tooltip and row components, the
formatting and the styles. The only differences are where the tooltip state
lives and how rows reach the DOM.

Baseline is capped at 10,000 rows. At 100,000 the tab stops responding rather
than merely getting slow, and an unresponsive tab produces no comparison.

## Hypothesis

1. The tooltip is the only consumer of high-frequency pointer state. Everything
   else re-renders because of where the state was declared, not because it needs
   the value.
2. The DOM should hold what the viewport shows, not what the dataset contains.

The two are independent, so they are implemented and measured separately.

## Optimizations

**Tooltip state moved behind a narrow external store.** Under sixty lines with
`getSnapshot`, `subscribe`, `set` and `reset`, created per dashboard instance. The chart
adapter pushes immutable snapshots into it; only the tooltip subscribes, through
`useSyncExternalStore`. Snapshots that are field-for-field identical do not
notify, so a pointer that moves within one pixel bucket costs nothing.

**Trade rows windowed in the DOM.** TanStack Virtual over a fixed 44-pixel row
height with eight rows of overscan, keyed by trade id. The scroll container keeps
table and row semantics, stays keyboard focusable, and reports its mounted-row
count to the observer so the number is testable rather than eyeballed.

**Chart series bounded to 2,000 points.** The table keeps every selected trade;
the chart gets a chronological min/max sample per bucket with both endpoints
preserved. Each sampled point carries its source trade id and P&L, so tooltips
read real trade data instead of interpolating from a sampled position.

## Measured evidence

`apps/lab/e2e/performance.spec.ts` drives the built application in Chromium at
1440 × 900, moves the pointer through 30 distinct chart positions in each mode,
and diffs the observer snapshot before and after.

| Mode | Dashboard renders | Tooltip renders | Mounted rows | React commit time |
| --- | ---: | ---: | ---: | ---: |
| Baseline, 10K | 30 | 0 | 10,000 | 4,699 ms |
| Optimized, 10K | 0 | 31 | 22 | 2.9 ms |

The same run asserts that the optimized table mounts at most 80 rows for the
100,000-trade dataset. Full output is in
[artifacts/performance/latest.md](artifacts/performance/latest.md).

The commit times come from React Profiler in the same run, so they are comparable
to each other: the baseline spends about 157 ms of commit work per pointer move —
roughly ten dropped frames each time the cursor moves — while the optimized path
spends under a tenth of a millisecond. Those absolute numbers belong to the
machine that produced them, which is why the benchmark asserts render counts and
mounted-row counts instead. A threshold like "under 16 ms" would pass on a fast
CI runner while the regression it exists to catch went through.

## Why these choices

**Why not memoize the dashboard?** `memo` and `useMemo` would not help: the
dashboard re-renders because its own state changed, and that is the one thing
memoization cannot prevent. It would also leave the state in the wrong place, so
every future child would inherit the problem.

**Why not write the tooltip to the DOM directly?** It would work, and it is what
the chart library itself does. It also splits ownership of one element between
React and manual DOM code, and the tooltip is not static — it has a live region,
a formatted currency value, and edge-flipping logic. The store keeps React in
charge of markup while moving only the update frequency out of the tree.

**Why not Zustand or Redux?** The state is one object, owned by one component
instance, read by one subscriber, and dead when the dashboard unmounts. A
dependency would add a provider, a devtools story and a selector API to a
problem that `useSyncExternalStore` already solves in under sixty lines.

**Why not mount all 100,000 rows?** That is the baseline, and it is measured: the
tab becomes unusable well before that. Pagination was the alternative considered
and rejected — it bounds the DOM just as well but changes the browsing model,
and the point here is continuous access to the whole client-side dataset.

**Why not feed all 100,000 points to the chart?** The canvas cannot draw more
points than it has pixels, so the extra points only cost memory and per-update
work. Min/max bucketing keeps the visible shape, including spikes, which simple
stride sampling would drop.

## Trade-offs and limitations

- Browser find does not see unmounted rows. Searching the full dataset would need
  an application-level control.
- Fixed row height keeps the example deterministic; variable-height rows would
  need measurement and scroll correction.
- The chart is a shape-preserving summary, not a lossless series. Analytical use
  would need a separate full-resolution path.
- The comparison of tooltip isolation happens at 10K, because the baseline cannot
  be run at 100K. Only the optimized mode is exercised at full size.
- The deployed build keeps React profiling enabled so commit counts stay
  available. That is a deliberate deviation from a normal production build, and
  those timings are only comparable within the same build and machine.
- Deterministic fixtures are repeatable but model no network, no backpressure and
  no server-side pagination.

## Running locally

Node.js 24 and pnpm 10.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Other commands:

```bash
pnpm verify      # lint, types, unit tests, build, end-to-end tests
pnpm test:unit   # unit tests only
pnpm benchmark   # rebuild, re-run the structural benchmark, rewrite artifacts/performance
```

The benchmark needs the pinned browser once:

```bash
pnpm --filter @riguran/frontend-performance-lab exec playwright install chromium
```

## The render observer

Instrumentation lives in `packages/render-observer`, published as
[`@riguran/render-observer`](https://www.npmjs.com/package/@riguran/render-observer).
It is separate from the application for one reason: the same snapshot has to be
readable from three places — the metrics panel in React, unit tests in Node, and
Playwright through `window.__RENDER_LAB__`. Keeping the core free of React (and
of browser globals, including `requestAnimationFrame`, which is injected as a
scheduler) is what makes the last two possible. The React bindings are a thin
adapter on a separate entry point.

## Notes on the data

Every trade, price and timestamp is generated locally from a seeded PRNG. There
is no proprietary data, employer code or vendor material in this repository.

MIT licensed.
