# ADR-005: Keep startup lightweight and chart data bounded

**Status:** Accepted

**Date:** 2026-08-11

## Context

The lab originally loaded its display fonts from Google Fonts and created the 100,000-trade scenario on the first render. In local WebKit testing, the third-party stylesheet could block a usable page for more than 60 seconds. Table virtualization already kept the mounted row count small, but the chart and tooltip index still duplicated all 100,000 derived points.

The 100K case must remain directly reproducible without making every portfolio visit pay its startup and retained-memory cost.

## Decision

- Bundle the Latin variable WOFF2 files for Inter and IBM Plex Sans with Vite and make no runtime request to Google Fonts.
- Start the optimized application at 10,000 trades and keep 100K as an explicit option.
- Keep the complete selected trade array for the table.
- Derive at most 2,000 chart points by preserving the first and last trades and selecting chronological minimum and maximum cumulative P&L values from interior buckets.
- Carry the source trade ID and P&L on every sampled point so chart tooltips do not infer metadata from the sampled position.
- Verify startup in Playwright WebKit and keep the 100K table path covered in Chromium.

## Consequences

- Typography remains consistent while startup no longer depends on a third-party origin.
- Normal visits allocate the 10K scenario; the heaviest dataset is intentional user work.
- Chart and tooltip structures stay bounded while the virtual table still provides continuous access to all 100,000 trades.
- The chart is a shape-preserving summary rather than a lossless export. Any future analytical use would need a separate full-resolution data path.
