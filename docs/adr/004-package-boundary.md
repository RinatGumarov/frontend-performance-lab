# ADR-004: Keep the observer core framework-free

**Status:** Accepted

**Date:** 2026-08-09

## Context

The lab needs one observation contract for visible metrics, unit tests, React components, and Playwright. Publishing the entire application or a React-specific singleton would not create a credible reusable package.

The underlying operations—immutable snapshots, subscriptions, counters, mounted-item totals, frame samples, and reset—do not require React or the DOM.

## Decision

Publish `@riguran/render-observer` as an ESM-only package with two entry points:

- `@riguran/render-observer` contains the framework-free observer and scheduler-driven frame sampler;
- `@riguran/render-observer/react` contains `useRenderSnapshot`, `useRenderMarker`, and `RenderProfiler`.

React is a peer dependency used only by the subpath. The core module does not read browser globals during import. Animation-frame sampling requires an explicit scheduler, which lets consumers choose browser APIs and lets tests supply deterministic clocks.

The package tarball includes compiled ESM, declarations, README, license, and package metadata only. A clean temporary consumer verifies runtime imports, peer resolution, types, and documentation examples.

## Consequences

- Non-React consumers can use the observer without installing a UI framework.
- React is not duplicated in the runtime bundle.
- Server-side import of the core is safe, although frame sampling still needs a provided scheduler.
- CommonJS consumers need an ESM-compatible build or dynamic import.
- The package remains an observation primitive, not a benchmark runner, analytics SDK, or state manager.
