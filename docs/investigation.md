# How the render path was investigated

Notes from building the lab, in the order things actually happened.

## Starting point

The first version was the obvious one. `BaselineDashboard` owns the chart and the
trade table, and it owns the tooltip snapshot:

```tsx
const [tooltip, setTooltip] = useState<TooltipSnapshot>(HIDDEN_TOOLTIP);
// ...
<EquityChart onTooltipChange={setTooltip} points={equity} />
<Tooltip snapshot={tooltip} />
<BaselineTradeTable trades={trades} observer={observer} />
```

With 1,000 trades it feels fine. With 10,000 it does not: moving the pointer
across the chart makes the whole view stutter, and the tooltip lags behind the
cursor by a visible margin.

## Observation

"Feels slow" is not something I can put in a commit message, so the first thing
built was the measurement, not the fix. `useRenderMarker` increments a counter in
a layout effect after a component commits, and the virtual table reports how many
rows are currently mounted. Both feed one immutable snapshot that the metrics
panel renders and Playwright can read through `window.__RENDER_LAB__`.

The counters say the obvious thing out loud: 30 pointer moves across the chart
produce 30 dashboard renders, with 10,000 rows mounted underneath. The chart's
crosshair handler fires several times per frame; React coalesces those into one
render per frame, but each render still walks a subtree containing the entire
table.

React Profiler commit durations, collected through `RenderProfiler`, confirm the
shape: commit time tracks the row count, not the tooltip.

## Hypothesis

The tooltip is the only thing that needs the pointer state. Nothing else in the
dashboard reads `x`, `y`, `tradeId` or `pnl`. The re-renders exist because of
where the state was declared, not because anything downstream depends on it.

If that is true, moving the state out of the React tree and subscribing only the
tooltip should drop dashboard renders during a pointer sweep to zero, without
touching the table.

## Experiment: isolate the tooltip

`createTooltipStore` is a sixty-line module exposing `getSnapshot`, `subscribe`,
`set` and `reset`. It is created per dashboard instance with
`useState(createTooltipStore)`, so it dies with the dashboard and cannot leak
between mounts. The chart pushes complete immutable snapshots into it; `set`
compares fields and skips notification when nothing changed. Only
`OptimizedTooltip` subscribes, via `useSyncExternalStore`.

Nothing else changed — same chart adapter, same `Tooltip` component, same table.

**Result**, 30 pointer positions at 10,000 trades, Chromium at 1440 × 900:

| | Dashboard renders | Tooltip renders | Mounted rows | React commit time |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 30 | 0 | 10,000 | 4,699 ms |
| Optimized | 0 | 31 | 22 | 2.9 ms |

Dashboard renders during a pointer sweep went to zero. The tooltip now renders
once per coalesced pointer update, which is what it is for. In the baseline the
tooltip has no counter of its own, because it is not a subscriber there — it
re-renders as part of the dashboard.

The commit times are from the same run and the same machine, so the ratio is the
part worth reading: the baseline spends roughly 157 ms committing per pointer
move, which is about ten frames dropped every time the cursor moves. That matches
what the stutter felt like before any of this was measured.

## Second bottleneck

Isolating the tooltip fixes hovering. It does not fix the table: the baseline
still mounts one DOM row per trade, and the cost simply moves to mount and
scroll. At 100,000 rows the tab stops responding well before the measurement
starts, which is why baseline mode is capped at 10,000 and says so in the UI.

**Experiment:** window the rows with TanStack Virtual — fixed 44-pixel rows,
eight rows of overscan, keyed by trade id — while keeping the same `TradeRow`
component and the same table semantics.

**Result:** 22 mounted rows at 10,000 trades, and no more than 80 at 100,000, at
the same viewport. The DOM now follows the viewport instead of the dataset; the
benchmark asserts that bound rather than a duration.

## Third thing, found the hard way

The 100K scenario was created on first render and the display fonts came from
Google Fonts. On WebKit that combination could take over a minute to reach a
usable page — the third-party stylesheet blocks rendering and the dataset
allocation lands in the same window.

Two changes: the fonts are bundled as local WOFF2 assets so startup makes no
third-party request, and the app starts at 10,000 trades with 100K one control
away. `e2e/webkit-startup.spec.ts` guards the first part, because the regression
is invisible in Chromium.

The chart also kept a derived point per trade. The canvas cannot draw more points
than it has pixels, so the series is now capped at 2,000 points using
chronological min/max bucketing, keeping both endpoints and carrying each point's
source trade id and P&L so tooltips read real trades rather than interpolating.

## Why not the other options

**Memoize the dashboard.** The dashboard re-renders because its own state
changed. `memo` guards props, not state, so it would have measured nothing and
fixed nothing — and the state would still be in the wrong place.

**Write the tooltip to the DOM by hand.** Faster to do, and the chart library
already does this internally. But the tooltip has a live region, currency
formatting, and edge-flip positioning, and splitting one element between React
and imperative DOM code makes cleanup and testing worse. The store moves the
update frequency out of the tree while leaving markup with React.

**Reach for Zustand or Redux.** One object, one owner, one subscriber, discarded
on unmount. `useSyncExternalStore` is the standard library answer to exactly this
shape; a dependency would add a provider and a selector API and buy nothing.

**Keep the state in the tooltip itself.** That narrows React updates, but the
chart is imperative and would need to reach a component instance — passing
setters down through composition, or an event bus. Ownership gets harder to see,
not easier.

**Paginate instead of virtualizing.** Pagination bounds the DOM just as well and
is the right answer when the data is server-backed. It changes the browsing model
though, and the thing being demonstrated is continuous access to a full
client-side dataset.

**Draw the table on a canvas.** Smallest possible DOM, but focus management, hit
testing, selection and text accessibility all become mine to implement. That work
would be larger than the case study it was supposed to support.

## What the measurement does not cover

Render counts and mounted-row counts are structural and portable. Durations are
not: they are recorded in the artifact for context, but a timing threshold would
pass or fail on the machine rather than on the code. There is also no network, no
streaming updates and no server-side pagination here — a live feed would raise
questions about batching and backpressure that this lab does not answer.

Reproduction steps and where to put profiler captures are in
[evidence/](evidence/).
