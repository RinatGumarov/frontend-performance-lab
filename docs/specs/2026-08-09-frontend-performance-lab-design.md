# Frontend Performance Lab Design

**Status:** Approved for implementation

**Date:** 2026-08-09

## Purpose

Frontend Performance Lab is a public, recruiter-friendly React and TypeScript case study. It demonstrates two concrete performance techniques with evidence that can be reproduced in a visitor's browser:

- viewport-only rendering for a 100,000-row trade history;
- isolation of high-frequency tooltip updates from the dashboard React tree.

The project is intended for international Senior and Staff Frontend applications. All public copy, documentation, Storybook content, package documentation, and commit messages are in English.

## Product principles

1. **Show evidence, not claims.** Structural invariants are visible in the UI and enforced by tests. Environment-dependent timings are labeled as local observations.
2. **Keep the comparison fair.** Baseline and optimized modes use the same data, chart adapter, tooltip markup, row formatter, styling, and pointer input.
3. **Make the optimization explainable.** The baseline is intentionally inefficient but readable. The optimized implementation changes only the state boundary and table rendering strategy.
4. **Protect provenance.** The project uses deterministic synthetic data and contains no employer code, screenshots, API responses, styles, names, or internal terminology.
5. **Prefer small public APIs.** The npm package exposes only the primitives required by the lab and plausible external consumers.

## Scope

### Included

- a static React and TypeScript single-page application;
- baseline and optimized comparison modes;
- deterministic datasets of 1,000, 10,000, and 100,000 synthetic trades;
- an equity chart with a high-frequency tooltip interaction;
- a baseline table and a virtualized table;
- browser-visible render, DOM, and frame-health evidence;
- a public Storybook with component and composition stories;
- a public npm package named `@riguran/render-observer`;
- unit, component, Storybook, accessibility, E2E, and structural performance tests;
- GitHub Actions, GitHub Pages, npm package provenance, ADRs, and recruiter-first documentation.

### Excluded

- authentication, a backend, persistence, or live market data;
- WebSockets, workers, or server-side rendering;
- a general-purpose component library;
- telemetry or external analytics;
- hard-coded performance numbers;
- a hosted visual-regression service in the initial release;
- employer data or implementation details.

## Workspace architecture

The repository is a pnpm workspace with two package boundaries:

```text
frontend-performance-lab/
├── apps/
│   └── lab/
│       ├── .storybook/
│       ├── e2e/
│       ├── src/
│       └── package.json
├── packages/
│   └── render-observer/
│       ├── src/
│       ├── test/
│       └── package.json
├── artifacts/performance/
├── docs/adr/
├── docs/specs/
├── scripts/
├── .github/workflows/
├── package.json
└── pnpm-workspace.yaml
```

`apps/lab` consumes `@riguran/render-observer` through the workspace protocol. Stories are colocated with the production components they document. The package never imports application code. Storybook is a build surface of the lab rather than an artificial third package.

## Runtime comparison contract

Both modes receive the same immutable `Trade[]` and derived equity series.

### Shared behavior

- deterministic seeded generator;
- one shared lightweight chart adapter;
- one tooltip presentation component;
- one row presentation component and formatting layer;
- identical pointer-to-trade mapping;
- identical responsive layout and visual styling;
- instrumentation from the same observer API.

### Baseline mode

- keeps `TooltipSnapshot` in dashboard React state;
- creates a new snapshot on each relevant pointer move;
- rerenders the dashboard subtree during the interaction;
- mounts every trade row;
- is capped at 10,000 rows with an explicit safety message.

### Optimized mode

- writes tooltip updates to a dedicated external tooltip store;
- subscribes only the tooltip presentation component;
- keeps the dashboard render count unchanged during tooltip movement after warm-up;
- virtualizes the table with a small overscan window;
- supports 100,000 trades while mounting no more than 80 trade rows in the desktop benchmark viewport.

React Compiler remains disabled for the comparison. The optimization techniques must stay explicit and interview-defensible.

## Data flow

1. The user selects an implementation and dataset size.
2. A deferred dataset value prevents the control interaction from blocking immediately.
3. The deterministic generator creates trades with a fixed seed outside module initialization.
4. Equity aggregation runs once for the committed dataset.
5. The selected dashboard receives the same trade and equity inputs.
6. Pointer movement is converted by the shared chart adapter into `TooltipSnapshot` values.
7. Baseline sends snapshots to React state; optimized sends them to a dedicated tooltip store.
8. The observer exposes render, mounted-row, profiler, and frame-sampling evidence.
9. Playwright reads the same public snapshot contract used by the visible metrics panel.

Dataset generation time is never mixed into the explicit interaction sample.

## npm package design

The package name is `@riguran/render-observer`. This avoids confusion with the browser's native `PerformanceObserver` API.

### Core export

```ts
import {
  createRenderObserver,
  startFrameSample,
} from '@riguran/render-observer';
```

The core export provides:

- immutable snapshots;
- subscription and cleanup;
- named render counters;
- mounted-item counts;
- profiler commit samples;
- explicit context metadata;
- cancellable requestAnimationFrame sampling.

The module does not read `window` or the DOM during import. Frame sampling accepts a scheduler dependency so the core is deterministic in tests.

### React export

```ts
import {
  RenderProfiler,
  useRenderMarker,
  useRenderSnapshot,
} from '@riguran/render-observer/react';
```

The React entry point contains thin adapters over the core store. React and React DOM are peer dependencies and do not appear in the package runtime bundle.

No React context, global singleton, logging, analytics, or implicit observer is included.

## Component boundaries

- `App` owns selected mode, requested dataset size, deferred generation state, and benchmark lifecycle.
- `BaselineDashboard` owns baseline tooltip state and composes shared chart, tooltip, table, and metrics components.
- `OptimizedDashboard` owns no hover coordinates and composes the same shared presentation components.
- `EquityChart` owns the imperative chart instance, resize handling, event translation, and cleanup.
- `Tooltip` is presentational and accepts a complete snapshot.
- `BaselineTradeTable` renders the supplied rows without virtualization.
- `VirtualTradeTable` owns the virtualizer and reports the mounted range without creating metrics-only React state.
- `MetricsPanel` subscribes to the observer snapshot and labels duration values as environment-dependent.
- domain modules generate and aggregate data without React dependencies.

Each boundary has one primary responsibility and a typed interface that can be tested without reading its internals.

## Visual direction

The product balances an engineering lab with a polished portfolio piece:

- neutral graphite and warm off-white surfaces with one restrained green accent;
- a concise recruiter-first hero that states the 100,000-trade problem;
- implementation and dataset controls above the evidence surface;
- chart and browser evidence in a two-column desktop layout;
- trade history below them;
- one-column mobile layout with no page-level horizontal overflow;
- strong focus states, color-independent P&L labels, and reduced-motion support;
- direct links to GitHub, Storybook, and npm.

Optimized mode with 100,000 trades is the default public view. Selecting baseline while 100,000 is active clamps the effective dataset to 10,000 and displays the safety explanation.

The visual language must remain original rather than imitate another trading product.

## Storybook

Storybook demonstrates practical component development rather than a large artificial design system. It includes:

- controls and dataset selectors;
- tooltip hidden, positive, and negative states;
- trade-row variants;
- metrics-panel states;
- baseline and optimized dashboard compositions;
- loading, capped-baseline, and chart-error states;
- interaction tests and accessibility checks.

Storybook uses the production components and CSS. It builds under `/frontend-performance-lab/storybook/` in the same GitHub Pages artifact as the application.

## Error handling and cleanup

- dataset generation exposes pending state and never runs at module import time;
- baseline cannot mount more than 10,000 rows;
- chart initialization failures render a local fallback while controls and the table remain usable;
- chart listeners, resize observers, frame requests, and subscriptions are removed on cleanup;
- identical observer snapshots do not notify subscribers;
- mode or dataset changes cancel an in-flight interaction sample;
- unsupported frame sampling returns an explicit error result instead of throwing during import;
- benchmark status is announced through an accessible live region;
- CI distinguishes structural assertions from variable timings.

## Verification strategy

### Unit and component tests

- generator determinism and trade invariants;
- equity aggregation;
- observer immutability, no-op updates, subscription cleanup, and reset behavior;
- scheduler-driven frame sampling and cancellation;
- baseline render behavior;
- optimized tooltip isolation;
- virtual table row ceiling and accessible row metadata;
- controls, clamping, pending state, and error fallbacks.

### Storybook and accessibility

- component states use real production components;
- interaction tests cover mode controls and tooltip states;
- automated accessibility checks cover stories and the application shell;
- keyboard navigation and reduced-motion behavior receive explicit coverage.

### E2E and performance evidence

- desktop viewport: 1440 by 900;
- mobile viewport: 390 pixels wide;
- optimized 100,000-row table mounts at most 80 trade rows;
- 30 optimized pointer moves add zero dashboard renders after warm-up;
- 30 baseline pointer moves add at least 20 dashboard renders;
- baseline 10,000 mode mounts 10,000 rows;
- functional tests cover switching, scrolling, tooltip content, focus, and overflow;
- the benchmark exports browser, viewport, timestamp, structural counts, and observed durations;
- structural assertions run twice locally before release;
- CI contains no machine-dependent millisecond thresholds.

### Package verification

- package exports and declaration files resolve from a clean consumer fixture;
- `npm pack --dry-run` and tarball inspection reject missing or unnecessary files;
- tests verify ESM import and React subpath import;
- the package bundle contains no duplicate React runtime;
- README examples compile against the packed tarball.

## Documentation

The main README is ordered for a five-minute recruiter review:

1. What this proves
2. Live demo
3. Measured comparison
4. Architecture
5. Storybook and npm package
6. Run locally
7. Run the benchmark
8. Testing
9. Trade-offs
10. Privacy and provenance

ADRs record the comparison contract, tooltip state boundary, table virtualization choice, and package boundary.

## Repository history

The repository uses the configured Git identity `Rinat <tiran678@icloud.com>`. Commits follow meaningful development boundaries: design, workspace, package core, React integration, deterministic data, baseline, optimized mode, Storybook, benchmarks, documentation, and deployment.

Commit and author dates reflect the actual work. The history does not use fabricated dates, fabricated co-authors, or bulk backdating. Product documentation and ADRs are included; internal brainstorming artifacts and unrelated workspace files are excluded.

## Release sequence

1. Run the complete local quality gate and benchmark twice.
2. Inspect repository contents, licenses, generated artifacts, and secret scans.
3. Present the exact commit SHA for publication approval.
4. Create the public GitHub repository and push `main`.
5. Verify GitHub Actions and the GitHub Pages application and Storybook paths.
6. Build and inspect the npm tarball and request separate publish approval.
7. Publish `@riguran/render-observer@0.1.0` as a public scoped package with provenance.
8. Verify installation from npm in a clean temporary consumer.
9. Update live links only after both release surfaces pass.
10. Treat GitHub profile pinning and resume edits as separate external actions.

The first npm release runs in a protected GitHub Actions environment with provenance and a short-lived granular token, because npm requires a package to exist before Trusted Publishing can be configured. The token is revoked immediately after `0.1.0`; subsequent releases use Trusted Publishing without a long-lived token.

## Acceptance criteria

- optimized mode supports 100,000 deterministic synthetic trades;
- optimized table mounts no more than 80 rows in the benchmark viewport;
- optimized tooltip movement does not rerender the dashboard after warm-up;
- baseline demonstrates the contrasting behavior without freezing the page;
- application, Storybook, package, documentation, and exported evidence are public and cross-linked;
- all quality gates and accessibility checks pass;
- no private or employer material is present;
- timings are reproducible observations, never invented claims;
- GitHub and npm publication occur only after explicit approval of the exact artifacts.
