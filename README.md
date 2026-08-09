# Frontend Performance Lab

A React case study: render a large trade history without letting high-frequency
chart interaction re-render the whole dashboard.

The plan is to build the naive version first, measure it, and keep it in the
repository as a control while the optimized implementation is developed next to
it.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```
