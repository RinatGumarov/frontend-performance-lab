# ADR-003: Window trade rows in the DOM

**Status:** Accepted

**Date:** 2026-08-09

## Context

The optimized view must make 100,000 trades browsable without mounting 100,000 row elements. The solution should preserve row semantics, keyboard access to the scroll region, shared row presentation, and straightforward React composition.

## Options considered

### Pagination

Pagination strictly bounds the DOM and works well for server-backed navigation. It changes the browsing model, adds page state, and does not demonstrate continuous access to the full client-side dataset.

### DOM windowing

Windowing preserves one continuous scroll range while mounting only the viewport and a small overscan buffer. Rows remain regular React elements and can reuse the baseline presentation component.

### Canvas rendering

Canvas can draw large grids with a small DOM, but requires custom focus, hit testing, selection, text accessibility, and rendering infrastructure. That complexity would dominate the state-isolation case study.

## Decision

Use TanStack Virtual to window trade rows. Keep the header outside the virtual canvas, estimate a fixed 44-pixel row height, use eight rows of overscan, and key items by stable trade identifiers.

The scroll container exposes table and row metadata, remains keyboard-focusable, and reports the current mounted-row count to the shared observer. The 1440 × 900 benchmark rejects more than 80 mounted rows for the 100,000-trade dataset.

## Consequences

- DOM size follows viewport size rather than dataset size.
- Baseline and optimized paths reuse the same `TradeRow` component.
- Browser find does not discover unmounted rows; full-dataset search would need an application feature.
- Fixed-height rows keep the example deterministic. Variable-height content would require measurement and scroll-adjustment handling.
