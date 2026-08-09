import type { RenderSnapshot } from '@riguran/render-observer';
import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const performanceDirectory = fileURLToPath(
  new URL('../../../artifacts/performance/', import.meta.url),
);
const interactionCount = 30;

interface BenchmarkReport {
  browser: string;
  viewport: { width: number; height: number };
  generatedAt: string;
  baseline: RenderSnapshot;
  optimized: RenderSnapshot;
  disclaimer: 'Local observation; not a universal guarantee.';
}

function subtractSnapshots(
  before: RenderSnapshot,
  after: RenderSnapshot,
): RenderSnapshot {
  const renderIds = new Set([
    ...Object.keys(before.renders),
    ...Object.keys(after.renders),
  ]);
  const renders = Object.fromEntries(
    [...renderIds].map((id) => [
      id,
      (after.renders[id] ?? 0) - (before.renders[id] ?? 0),
    ]),
  );

  return {
    context: after.context,
    renders,
    mountedItems: after.mountedItems,
    profiler: {
      commitCount:
        after.profiler.commitCount - before.profiler.commitCount,
      totalDurationMs:
        after.profiler.totalDurationMs - before.profiler.totalDurationMs,
    },
    frames: {
      sampleCount: after.frames.sampleCount - before.frames.sampleCount,
      gapCount: after.frames.gapCount - before.frames.gapCount,
      maxGapMs: after.frames.maxGapMs,
    },
  };
}

async function snapshot(page: Page): Promise<RenderSnapshot> {
  return page.evaluate(() => window.__RENDER_LAB__.snapshot());
}

async function resetObserver(page: Page): Promise<void> {
  await page.evaluate(() => window.__RENDER_LAB__.reset());
}

async function waitForMode(
  page: Page,
  mode: 'baseline' | 'optimized',
  datasetSize: number,
): Promise<void> {
  await page.waitForFunction(
    ([expectedMode, expectedSize]) => {
      const current = window.__RENDER_LAB__.snapshot();
      return (
        current.context.mode === expectedMode &&
        current.context.datasetSize === expectedSize &&
        (current.mountedItems.trades ?? 0) > 0
      );
    },
    [mode, datasetSize] as const,
  );
}

async function movePointerAcrossChart(page: Page): Promise<void> {
  const chart = page.getByTestId('chart-surface');
  await chart.scrollIntoViewIfNeeded();
  const bounds = await chart.boundingBox();
  expect(bounds).not.toBeNull();

  const startX = bounds!.x + bounds!.width * 0.12;
  const usableWidth = bounds!.width * 0.66;
  for (let index = 0; index < interactionCount; index += 1) {
    const progress = index / (interactionCount - 1);
    await page.mouse.move(
      startX + usableWidth * progress,
      bounds!.y + bounds!.height * 0.45,
    );
    await page.waitForTimeout(16);
  }
}

test('records reproducible structural rendering evidence', async ({
  browserName,
  page,
}) => {
  await page.goto('/');
  await waitForMode(page, 'optimized', 100_000);

  const optimizedAt100K = await snapshot(page);
  expect(optimizedAt100K.mountedItems.trades).toBeLessThanOrEqual(80);

  await page.getByRole('radio', { name: '10K' }).click();
  await waitForMode(page, 'optimized', 10_000);
  await resetObserver(page);

  await page.getByRole('radio', { name: 'Baseline' }).click();
  await waitForMode(page, 'baseline', 10_000);
  await page.getByRole('radio', { name: 'Optimized' }).click();
  await waitForMode(page, 'optimized', 10_000);

  const optimizedBefore = await snapshot(page);
  await movePointerAcrossChart(page);
  await expect(page.locator('output')).toContainText(/Trade #\d+/);
  const optimizedAfter = await snapshot(page);
  const optimized = subtractSnapshots(optimizedBefore, optimizedAfter);

  expect(optimized.renders.dashboard ?? 0).toBe(0);
  expect(optimized.mountedItems.trades).toBeLessThanOrEqual(80);

  await resetObserver(page);
  await page.getByRole('radio', { name: 'Baseline' }).click();
  await waitForMode(page, 'baseline', 10_000);

  const baselineBefore = await snapshot(page);
  await movePointerAcrossChart(page);
  const baselineAfter = await snapshot(page);
  const baseline = subtractSnapshots(baselineBefore, baselineAfter);

  expect(baseline.renders.dashboard ?? 0).toBeGreaterThanOrEqual(20);
  expect(baseline.mountedItems.trades).toBe(10_000);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const report: BenchmarkReport = {
    browser: browserName,
    viewport: viewport!,
    generatedAt: new Date().toISOString(),
    baseline,
    optimized,
    disclaimer: 'Local observation; not a universal guarantee.',
  };

  await mkdir(performanceDirectory, { recursive: true });
  await writeFile(
    `${performanceDirectory}/raw.json`,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
});
