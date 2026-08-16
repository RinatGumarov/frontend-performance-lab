# ADR-002: Tooltip state lives in a per-dashboard external store

**Date:** 2026-08-10

## Context

Chart crosshair events arrive several times per frame. The tooltip needs the
coordinates and the trade result; the dashboard, the chart instance and the table
do not. Holding that state at the dashboard boundary makes every pointer event
eligible to re-render the whole subtree — see
[the investigation notes](../investigation.md) for the measurements and the
alternatives that were rejected.

## Decision

The optimized dashboard creates a `TooltipStore` with
`useState(createTooltipStore)` and exposes `getSnapshot`, `subscribe`, `set` and
`reset`. The chart pushes complete immutable snapshots; `set` skips notification
when every field is unchanged. Only the tooltip subscribes, through
`useSyncExternalStore`.

The store instance is local to the dashboard — no context, no module-level
singleton, no state-management dependency. The baseline keeps its `useState`
version so the comparison stays explicit.

## Consequences

- Pointer updates re-render one subscriber.
- React still owns the tooltip's markup, live region and accessibility.
- Store lifetime follows dashboard lifetime, so nothing leaks between mounts.
- One more indirection to read, in exchange for a contract that can be tested
  without the chart vendor.
