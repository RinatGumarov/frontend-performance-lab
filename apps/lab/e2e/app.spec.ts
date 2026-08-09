import { expect, test, type Page } from '@playwright/test';

async function expectNoPageOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
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

test('opens in the optimized 100K state and reaches the end of the virtual table', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('radio', { name: 'Optimized' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '100K' })).toBeChecked();

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
  await page.goto('/');

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
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Rendering 100,000 trades without rerendering the dashboard',
    }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
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
  await page.goto('/');

  await expect(page.getByRole('status').filter({ hasText: 'Chart unavailable' })).toBeVisible();
});
