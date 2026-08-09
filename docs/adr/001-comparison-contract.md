# ADR-001: Keep the performance comparison controlled

**Status:** Accepted

**Date:** 2026-08-09

## Context

A baseline-versus-optimized demo is useful only when both paths solve the same problem. Changing the dataset, chart, markup, or interaction together with the optimization would make the result easy to exaggerate and difficult to explain.

Browser timings also vary with hardware, browser builds, thermal state, and concurrent work. A single duration cannot be treated as a universal threshold.

## Decision

Both modes use the same:

- seeded trade generator with seed `42`;
- immutable trade and equity inputs;
- chart adapter and pointer-to-trade mapping;
- tooltip and trade-row presentation components;
- formatting, layout, styling, and observer API;
- 10,000-trade dataset for the tooltip-update comparison;
- 30 distinct pointer positions after the selected mode is mounted.

The structural benchmark runs in Chromium at 1440 × 900. It requires:

- zero optimized dashboard render increments during the pointer sequence;
- at least 20 baseline dashboard render increments during the same sequence;
- exactly 10,000 mounted baseline rows;
- no more than 80 mounted optimized rows in the separate 100,000-trade check.

Durations are recorded in the evidence artifact but are not release gates. Baseline mode is capped at 10,000 rows and labels that constraint in the interface.

## Consequences

- The comparison remains reproducible across machines without pretending that timing values are portable.
- Reviewers can inspect the two intentional implementation differences directly.
- The baseline is not a recommendation; it is a transparent control case.
- A regression in the state boundary or virtualization strategy fails even when a fast CI machine hides the timing cost.
