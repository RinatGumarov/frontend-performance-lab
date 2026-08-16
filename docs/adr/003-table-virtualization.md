# ADR-003: Trade rows are windowed in the DOM

**Date:** 2026-08-11

## Context

The optimized view has to make 100,000 trades browsable without mounting 100,000
row elements, while keeping row semantics, keyboard access to the scroll region,
and the same presentation component as the baseline. Pagination and canvas
rendering were the alternatives; both are discussed in
[the investigation notes](../investigation.md).

## Decision

Window the rows with TanStack Virtual. The header stays outside the virtual
canvas, rows are estimated at a fixed 44 pixels with eight rows of overscan, and
items are keyed by trade id. The scroll container keeps `role="table"` /
`role="row"` metadata, stays keyboard focusable, and reports its mounted-row count
to the observer so the bound is asserted rather than assumed.

## Consequences

- DOM size follows the viewport, not the dataset.
- Baseline and optimized paths render the identical `TradeRow`.
- Browser find does not reach unmounted rows; full-dataset search would need an
  application-level control.
- Fixed row height keeps this deterministic. Variable heights would need
  measurement and scroll correction.
