import { createRenderObserver } from '@riguran/render-observer';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toEquitySeries } from '../../domain/equity';
import { generateTrades } from '../../domain/generate-trades';
import { createChartHarness } from '../chart/EquityChart.test-utils';
import { BaselineDashboard } from './BaselineDashboard';

describe('BaselineDashboard', () => {
  it('rerenders for tooltip moves and mounts every supplied row', async () => {
    const observer = createRenderObserver();
    const trades = generateTrades(1_000, 42).slice(0, 100);
    const equity = toEquitySeries(trades);
    const chart = createChartHarness();

    render(
      <BaselineDashboard
        trades={trades}
        equity={equity}
        observer={observer}
        chartFactory={chart.factory}
      />,
    );

    await waitFor(() => {
      expect(observer.getSnapshot().renders.dashboard).toBe(1);
    });
    const before = observer.getSnapshot().renders.dashboard ?? 0;

    for (const [index, point] of equity.slice(0, 3).entries()) {
      act(() => {
        chart.emit({
          point: { x: 40 + index * 10, y: 40 + index * 5 },
          time: point.time,
        });
      });
    }

    expect(observer.getSnapshot().renders.dashboard).toBeGreaterThan(before);
    expect(observer.getSnapshot().mountedItems.trades).toBe(100);
    expect(screen.getAllByTestId('trade-row')).toHaveLength(100);
    expect(screen.getByText('Trade #3')).toBeVisible();
  });
});
