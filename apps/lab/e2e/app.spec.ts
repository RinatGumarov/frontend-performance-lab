import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectControlsDashboardGap(page: Page): Promise<void> {
  const controls = page.getByRole('region', { name: 'Lab controls' });
  const dashboard = page.locator(
    'section[aria-label="Lab controls"] + section',
  );
  const [controlsBounds, dashboardBounds] = await Promise.all([
    controls.boundingBox(),
    dashboard.boundingBox(),
  ]);

  expect(controlsBounds).not.toBeNull();
  expect(dashboardBounds).not.toBeNull();
  expect(
    dashboardBounds!.y - (controlsBounds!.y + controlsBounds!.height),
  ).toBeGreaterThanOrEqual(16);
}

interface RelativeChartPoint {
  x: number;
  y: number;
}

interface CursorPosition {
  x: number;
  y: number;
}

async function moveAcrossChart(
  page: Page,
  point: RelativeChartPoint = { x: 0.45, y: 0.5 },
): Promise<CursorPosition> {
  const chart = page.getByTestId('chart-surface');
  await chart.scrollIntoViewIfNeeded();
  const bounds = await chart.boundingBox();
  expect(bounds).not.toBeNull();

  const cursor = {
    x: bounds!.x + bounds!.width * point.x,
    y: bounds!.y + bounds!.height * point.y,
  };
  await page.mouse.move(cursor.x, cursor.y);

  return cursor;
}

test('starts at 10K and reaches the end of the explicit 100K state', async ({
  page,
}) => {
  await page.goto('/frontend-performance-lab/');

  await expect(page.getByRole('radio', { name: 'Optimized' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '10K' })).toBeChecked();

  await page.getByRole('radio', { name: '100K' }).click();

  const table = page.getByRole('table', {
    name: 'Virtualized trade history',
  });
  await expect(table).toHaveAttribute('aria-rowcount', '100001');
  await expect
    .poll(() => page.getByTestId('trade-row').count())
    .toBeGreaterThan(0);

  await moveAcrossChart(page);
  await expect(page.locator('output')).toContainText(/Trade #\d+/);

  const rows = page.getByLabel('Scrollable trade rows');
  await rows.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByText('#100000', { exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
});

test('supports keyboard mode changes and clamps the baseline to 10K', async ({
  page,
}) => {
  await page.goto('/frontend-performance-lab/');

  const optimized = page.getByRole('radio', { name: 'Optimized' });
  const baseline = page.getByRole('radio', { name: 'Baseline' });
  await optimized.focus();
  await expect(optimized).toBeFocused();
  await page.keyboard.press('ArrowLeft');

  await expect(baseline).toBeFocused();
  await expect(baseline).toBeChecked();
  await expect(page.getByRole('radio', { name: '10K' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '100K' })).toBeDisabled();
  await expect(
    page.getByText(
      'Baseline is capped at 10,000 rows to keep this tab responsive.',
    ),
  ).toBeVisible();
  await expect(page.getByTestId('trade-row')).toHaveCount(10_000);
});

test('keeps the page inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/frontend-performance-lab/');

  await expect(
    page.getByRole('heading', {
      name: 'Rendering 100,000 trades without rerendering the dashboard',
    }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
});

test('separates the controls from the dashboard', async ({ page }) => {
  await page.goto('/frontend-performance-lab/');
  await expectControlsDashboardGap(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectControlsDashboardGap(page);
});

test('records React profiler commits in the production build', async ({
  page,
}) => {
  await page.goto('/frontend-performance-lab/');

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__RENDER_LAB__.snapshot().profiler.commitCount,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__RENDER_LAB__.snapshot().profiler.totalDurationMs,
      ),
    )
    .toBeGreaterThan(0);
});

test('offsets the tooltip from the cursor and flips it at chart edges', async ({
  page,
}) => {
  await page.goto('/frontend-performance-lab/');
  const tooltip = page.locator('output');
  const preferredCursor = await moveAcrossChart(page, { x: 0.55, y: 0.25 });
  await expect(tooltip).toBeVisible();

  const preferredBounds = await tooltip.boundingBox();
  expect(preferredBounds).not.toBeNull();
  expect(
    Math.abs(
      preferredCursor.x -
        (preferredBounds!.x + preferredBounds!.width) -
        16,
    ),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(preferredBounds!.y - preferredCursor.y - 16),
  ).toBeLessThanOrEqual(2);

  const edgeCursor = await moveAcrossChart(page, { x: 0.12, y: 0.92 });
  await expect
    .poll(async () => {
      const bounds = await tooltip.boundingBox();
      return bounds ? bounds.x - edgeCursor.x : null;
    })
    .toBeGreaterThanOrEqual(14);

  const [chartBounds, edgeBounds] = await Promise.all([
    page.getByTestId('chart-surface').boundingBox(),
    tooltip.boundingBox(),
  ]);

  expect(chartBounds).not.toBeNull();
  expect(edgeBounds).not.toBeNull();
  expect(
    Math.abs(edgeBounds!.x - edgeCursor.x - 16),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(edgeCursor.y - (edgeBounds!.y + edgeBounds!.height) - 16),
  ).toBeLessThanOrEqual(2);
  expect(edgeBounds!.x).toBeGreaterThanOrEqual(chartBounds!.x);
  expect(edgeBounds!.y).toBeGreaterThanOrEqual(chartBounds!.y);
  expect(edgeBounds!.x + edgeBounds!.width).toBeLessThanOrEqual(
    chartBounds!.x + chartBounds!.width,
  );
  expect(edgeBounds!.y + edgeBounds!.height).toBeLessThanOrEqual(
    chartBounds!.y + chartBounds!.height,
  );
});

test('shows a stable fallback when the chart vendor cannot start', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const createElement = Document.prototype.createElement;
    Object.defineProperty(Document.prototype, 'createElement', {
      configurable: true,
      value(this: Document, tagName: string, options?: ElementCreationOptions) {
        if (tagName.toLowerCase() === 'canvas') {
          throw new Error('Synthetic canvas failure');
        }
        return createElement.call(this, tagName, options);
      },
    });
  });
  await page.goto('/frontend-performance-lab/');

  await expect(page.getByRole('status').filter({ hasText: 'Chart unavailable' })).toBeVisible();
});
