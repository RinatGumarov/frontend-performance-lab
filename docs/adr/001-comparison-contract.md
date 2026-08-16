# ADR-001: What the baseline and optimized modes must share

**Date:** 2026-08-09

## Context

A baseline-versus-optimized demo only means something if both paths solve the
same problem. If the dataset, chart, markup or interaction drift apart along with
the optimization, any number I publish is unfalsifiable.

## Decision

Both modes use the same seeded generator (seed `42`), the same immutable trade
and equity inputs, the same chart adapter and pointer-to-trade mapping, the same
`Tooltip` and `TradeRow` components, and the same formatting, layout and observer
API. Exactly two things differ: where tooltip state lives, and how rows reach the
DOM.

The benchmark runs in Chromium at 1440 × 900, moves the pointer through 30
distinct positions per mode, and enforces:

- zero optimized dashboard renders during the sweep;
- at least 20 baseline dashboard renders during the same sweep;
- exactly 10,000 mounted baseline rows;
- at most 80 mounted optimized rows in the separate 100,000-trade check.

Durations are recorded in the artifact and are never pass/fail. Baseline mode is
capped at 10,000 rows, and the UI says so.

`scripts/write-benchmark-report.mjs` re-checks these invariants when it normalizes
a run, so a report cannot be committed that contradicts them.

## Consequences

- The comparison reproduces on other machines without pretending timings are
  portable.
- A regression in either boundary fails the benchmark even on a fast runner,
  where the timing cost would be invisible.
- The baseline is a control case, not a recommendation.
