import { expect, test } from '@playwright/test';

const GOOGLE_FONT_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

test('starts without render-blocking third-party font requests', async ({
  page,
}) => {
  const thirdPartyFontRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (GOOGLE_FONT_HOSTS.has(url.hostname)) {
      thirdPartyFontRequests.push(request.url());
    }
  });

  await page.goto('/frontend-performance-lab/');

  await expect(page.getByRole('radio', { name: '10K' })).toBeChecked();
  await expect(
    page.getByRole('region', { name: 'Optimized dashboard' }),
  ).toBeVisible();
  await expect(page.getByTestId('trade-row').first()).toBeVisible();
  expect(thirdPartyFontRequests).toEqual([]);
});
