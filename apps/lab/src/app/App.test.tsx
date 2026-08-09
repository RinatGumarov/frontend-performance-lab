import { createRenderObserver, type FrameScheduler } from '@riguran/render-observer';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChartHarness } from '../features/chart/EquityChart.test-utils';
import { mockElementSize } from '../test/element-size';
import { App } from './App';

afterEach(() => {
  vi.restoreAllMocks();
});

function createIdleScheduler(): FrameScheduler {
  return {
    request: vi.fn(() => 1),
    cancel: vi.fn(),
  };
}

describe('App', () => {
  it('starts optimized at 100K and clamps the baseline', async () => {
    mockElementSize({ height: 600, width: 1_200 });
    const observer = createRenderObserver();
    const chart = createChartHarness();
    const user = userEvent.setup();

    render(
      <App
        chartFactory={chart.factory}
        frameScheduler={createIdleScheduler()}
        observer={observer}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: /rendering 100,000 trades without rerendering the dashboard/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Optimized' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '100K' })).toBeChecked();
    await waitFor(() => {
      expect(observer.getSnapshot().context).toEqual({
        mode: 'optimized',
        datasetSize: 100_000,
      });
    });

    await user.click(screen.getByRole('radio', { name: 'Baseline' }));

    expect(screen.getByRole('radio', { name: '10K' })).toBeChecked();
    expect(
      screen.getByText(
        'Baseline is capped at 10,000 rows to keep this tab responsive.',
      ),
    ).toBeVisible();
    await waitFor(() => {
      expect(observer.getSnapshot().context).toEqual({
        mode: 'baseline',
        datasetSize: 10_000,
      });
    });
  });

  it('exposes interaction sampling status in a polite live region', async () => {
    mockElementSize({ height: 600, width: 1_200 });
    const chart = createChartHarness();
    const user = userEvent.setup();

    render(
      <App
        chartFactory={chart.factory}
        frameScheduler={createIdleScheduler()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Run interaction sample' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sampling 120 animation frames…',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
