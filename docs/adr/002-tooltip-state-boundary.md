# ADR-002: Isolate tooltip state with an external store

**Status:** Accepted

**Date:** 2026-08-09

## Context

Chart crosshair events can arrive many times per second. The tooltip needs the current coordinates and trade result, but the dashboard, chart instance, and trade table do not. Keeping that transient state at the dashboard boundary makes every pointer event eligible to rerender the entire subtree.

## Options considered

### Dashboard React state

This is the smallest implementation and remains the baseline. Its ownership is easy to understand, but every tooltip update rerenders the dashboard.

### Local React state inside the tooltip

This narrows React updates, but the imperative chart still needs a communication boundary to reach the tooltip. Passing setters or event plumbing through the composition obscures ownership and couples the chart adapter to a component instance.

### Direct DOM mutation

Moving and rewriting a tooltip element imperatively avoids React work, but splits presentation ownership between React and manual DOM code. Cleanup, accessibility state, and test setup become harder to reason about.

### External tooltip store

A small store accepts complete immutable tooltip snapshots. The optimized tooltip subscribes with `useSyncExternalStore`; the rest of the dashboard does not subscribe.

## Decision

Use a dedicated external tooltip store in the optimized dashboard. Keep the store instance local to that dashboard, expose `getSnapshot`, `subscribe`, and `set`, and render the existing tooltip component from `useSyncExternalStore`.

Retain dashboard React state in the baseline so the comparison remains explicit. Do not introduce React context, a global singleton, or a general state-management dependency.

## Consequences

- Pointer updates rerender only the optimized tooltip subscriber.
- React remains responsible for tooltip markup and accessibility.
- Store lifetime follows the dashboard lifetime, avoiding cross-instance state.
- The implementation adds one narrow abstraction, but its contract can be tested independently of the chart vendor.
