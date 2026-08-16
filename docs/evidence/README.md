# Evidence

Screenshots and profiler captures belong here. Nothing in this directory is
generated automatically, and nothing here is required for the measurements in
[the investigation notes](../investigation.md) — those come from
`artifacts/performance/`, which the benchmark rewrites.

## Reproducing the numbers

```bash
pnpm install --frozen-lockfile
pnpm --filter @riguran/frontend-performance-lab exec playwright install chromium
pnpm benchmark
```

This builds the workspace, serves the production build, runs the pointer sweep in
both modes at 1440 × 900, checks the invariants from
[ADR-001](../adr/001-comparison-contract.md), and rewrites
`artifacts/performance/{raw,latest}.json` and `latest.md`.

## Capturing a profiler trace by hand

1. `pnpm dev`, then open the lab with React DevTools installed.
2. Select **Baseline**, 10K, start a Profiler recording, sweep the pointer across
   the chart, stop.
3. Repeat in **Optimized** mode without changing the viewport.
4. Save both flamegraphs here as `profiler-baseline.png` and
   `profiler-optimized.png`, and note the browser, viewport and machine in the
   commit message.

The deployed build keeps React profiling enabled, so the same recording works
against the live demo.
