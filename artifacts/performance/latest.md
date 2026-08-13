# Local benchmark evidence

Generated at 2026-08-09T17:19:17.767Z with chromium at 1440 × 900 on darwin/arm64.

| Mode | Dataset | Dashboard render delta | Mounted rows | Profiler commit delta | Observed commit duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 10,000 | 30 | 10,000 | 0 | 0.00 ms |
| Optimized | 10,000 | 0 | 22 | 0 | 0.00 ms |

The benchmark moves the chart pointer through 30 distinct positions. It gates structural behavior only: the optimized dashboard must stay isolated, its virtual table must mount at most 80 rows, and the baseline must expose the contrasting rerenders with all 10,000 rows mounted. Durations are recorded for context and are not pass/fail thresholds.

> Local observation; not a universal guarantee.
