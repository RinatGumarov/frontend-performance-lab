import { expect, test, type Page } from '@playwright/test';

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

test('starts at 10K and browses the whole 100K dataset', async ({ page }) => {
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
});

test('renders the dashboard once per dataset change', async ({ page }) => {
  await page.goto('/frontend-performance-lab/');
  await expect(page.getByRole('radio', { name: '10K' })).toBeChecked();
  await page.evaluate(() => window.__RENDER_LAB__.reset());

  await page.getByRole('radio', { name: '100K' }).click();

  await expect
    .poll(() =>
      page.evaluate(() => window.__RENDER_LAB__.snapshot().context.datasetSize),
    )
    .toBe(100_000);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__RENDER_LAB__.snapshot().renders.dashboard ?? 0,
      ),
    )
    .toBe(1);
});

test('switches mode from the keyboard and clamps the baseline to 10K', async ({
  page,
}) => {
  await page.goto('/frontend-performance-lab/');

  const optimized = page.getByRole('radio', { name: 'Optimized' });
  const baseline = page.getByRole('radio', { name: 'Baseline' });
  await optimized.focus();
  await page.keyboard.press('ArrowLeft');

  await expect(baseline).toBeChecked();
  await expect(page.getByRole('radio', { name: '10K' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '100K' })).toBeDisabled();
  await expect(page.getByTestId('trade-row')).toHaveCount(10_000);
});

test('keeps React profiling data available in the production build', async ({
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
});

test('falls back to a readable status when the chart vendor cannot start', async ({
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

  await expect(
    page.getByRole('status').filter({ hasText: 'Chart unavailable' }),
  ).toBeVisible();
});
