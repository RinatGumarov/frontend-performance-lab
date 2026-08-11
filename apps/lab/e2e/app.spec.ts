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

async function moveAcrossChart(page: Page): Promise<void> {
  const chart = page.getByTestId('chart-surface');
  await chart.scrollIntoViewIfNeeded();
  const bounds = await chart.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(
    bounds!.x + bounds!.width * 0.45,
    bounds!.y + bounds!.height * 0.5,
  );
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

test('keeps the tooltip inside the chart', async ({ page }) => {
  await page.goto('/frontend-performance-lab/');
  await moveAcrossChart(page);

  const chartBounds = await page.getByTestId('chart-surface').boundingBox();
  const tooltip = page.locator('output');
  await expect(tooltip).toBeVisible();
  const tooltipBounds = await tooltip.boundingBox();

  expect(chartBounds).not.toBeNull();
  expect(tooltipBounds).not.toBeNull();
  expect(tooltipBounds!.y).toBeGreaterThanOrEqual(chartBounds!.y);
  expect(tooltipBounds!.y + tooltipBounds!.height).toBeLessThanOrEqual(
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
