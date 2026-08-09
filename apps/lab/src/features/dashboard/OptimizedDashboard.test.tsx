import { createRenderObserver } from '@riguran/render-observer';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toEquitySeries } from '../../domain/equity';
import { generateTrades } from '../../domain/generate-trades';
import { mockElementSize } from '../../test/element-size';
import { createChartHarness } from '../chart/EquityChart.test-utils';
import { OptimizedDashboard } from './OptimizedDashboard';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OptimizedDashboard', () => {
  it('isolates tooltip updates from the dashboard', async () => {
    mockElementSize({ height: 600, width: 1_200 });
    const observer = createRenderObserver();
    const trades = generateTrades(1_000, 42);
    const equity = toEquitySeries(trades);
    const chart = createChartHarness();

    render(
      <OptimizedDashboard
        trades={trades}
        equity={equity}
        observer={observer}
        chartFactory={chart.factory}
      />,
    );

    await waitFor(() => {
      expect(observer.getSnapshot().renders.dashboard).toBe(1);
      expect(screen.getAllByTestId('trade-row').length).toBeGreaterThan(0);
    });
    const dashboardBefore = observer.getSnapshot().renders.dashboard ?? 0;
    const tooltipBefore = observer.getSnapshot().renders.tooltip ?? 0;

    for (const [index, point] of equity.slice(0, 30).entries()) {
      act(() => {
        chart.emit({
          point: { x: 20 + index, y: 30 + index },
          time: point.time,
        });
      });
    }

    expect(observer.getSnapshot().renders.dashboard).toBe(dashboardBefore);
    expect(observer.getSnapshot().renders.tooltip).toBeGreaterThan(
      tooltipBefore,
    );
    expect(screen.getAllByTestId('trade-row').length).toBeLessThanOrEqual(80);
  });
});
