import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EquityPoint } from '../../domain/trade';
import {
  EquityChart,
  type ChartCrosshairEvent,
  type EquityChartAdapter,
} from './EquityChart';

const points: EquityPoint[] = [
  {
    time: 1_735_689_600_000,
    value: 100_000,
    tradeId: 1,
    pnl: 4.5,
  },
  {
    time: 1_735_689_660_000,
    value: 100_012.5,
    tradeId: 51,
    pnl: 7.25,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

function createAdapter() {
  let crosshairHandler: ((event: ChartCrosshairEvent) => void) | undefined;
  const adapter: EquityChartAdapter = {
    setData: vi.fn(),
    subscribeCrosshairMove: vi.fn((handler) => {
      crosshairHandler = handler;
    }),
    unsubscribeCrosshairMove: vi.fn(),
    resize: vi.fn(),
    remove: vi.fn(),
  };

  return {
    adapter,
    emit(event: ChartCrosshairEvent) {
      crosshairHandler?.(event);
    },
  };
}

describe('EquityChart', () => {
  it('creates one adapter, updates its data, and disposes it', () => {
    const harness = createAdapter();
    const chartFactory = vi.fn(() => harness.adapter);
    const firstTooltipHandler = vi.fn();
    const secondTooltipHandler = vi.fn();
    const observe = vi.fn();
    const disconnect = vi.fn();
    let resizeCallback: ResizeObserverCallback | undefined;
    class ResizeObserverStub {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);

    const { rerender, unmount } = render(
      <EquityChart
        points={points}
        onTooltipChange={firstTooltipHandler}
        chartFactory={chartFactory}
      />,
    );

    expect(chartFactory).toHaveBeenCalledOnce();
    expect(harness.adapter.setData).toHaveBeenCalledWith(points);
    expect(observe).toHaveBeenCalledOnce();

    resizeCallback?.(
      [{ contentRect: { width: 640, height: 320 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );
    expect(harness.adapter.resize).toHaveBeenCalledWith(640, 320);

    rerender(
      <EquityChart
        points={points}
        onTooltipChange={secondTooltipHandler}
        chartFactory={chartFactory}
      />,
    );
    harness.emit({ point: { x: 40, y: 24 }, time: points[1]!.time });

    expect(chartFactory).toHaveBeenCalledOnce();
    expect(firstTooltipHandler).not.toHaveBeenCalled();
    expect(secondTooltipHandler).toHaveBeenCalledWith({
      visible: true,
      x: 40,
      y: 24,
      tradeId: 51,
      pnl: 7.25,
    });

    unmount();

    expect(harness.adapter.unsubscribeCrosshairMove).toHaveBeenCalledOnce();
    expect(harness.adapter.remove).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('hides the tooltip when the crosshair leaves the series', () => {
    const harness = createAdapter();
    const onTooltipChange = vi.fn();
    render(
      <EquityChart
        points={points}
        onTooltipChange={onTooltipChange}
        chartFactory={() => harness.adapter}
      />,
    );

    harness.emit({ point: null, time: null });

    expect(onTooltipChange).toHaveBeenCalledWith({
      visible: false,
      x: 0,
      y: 0,
      tradeId: null,
      pnl: null,
    });
  });

  it('renders a fallback when chart creation fails', async () => {
    const chartFactory = vi.fn(() => {
      throw new Error('canvas unavailable');
    });

    render(
      <EquityChart
        points={points}
        onTooltipChange={vi.fn()}
        chartFactory={chartFactory}
      />,
    );

    expect(await screen.findByText('Chart unavailable')).toBeVisible();
  });
});
