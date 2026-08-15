import {
  AreaSeries,
  createChart,
  type MouseEventHandler,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import type { EquityPoint } from '../../domain/trade';
import styles from './EquityChart.module.css';
import { HIDDEN_TOOLTIP, type TooltipSnapshot } from './tooltip-types';

export interface ChartCrosshairEvent {
  point: { x: number; y: number } | null;
  time: number | null;
}

export interface EquityChartAdapter {
  setData(points: readonly EquityPoint[]): void;
  subscribeCrosshairMove(
    handler: (event: ChartCrosshairEvent) => void,
  ): void;
  unsubscribeCrosshairMove(
    handler: (event: ChartCrosshairEvent) => void,
  ): void;
  resize(width: number, height: number): void;
  remove(): void;
}

export type EquityChartFactory = (
  container: HTMLDivElement,
) => EquityChartAdapter;

export interface EquityChartProps {
  points: readonly EquityPoint[];
  onTooltipChange(snapshot: TooltipSnapshot): void;
  chartFactory?: EquityChartFactory;
}

interface TooltipPoint {
  tradeId: number;
  pnl: number | null;
}

function createDefaultChart(container: HTMLDivElement): EquityChartAdapter {
  const chart = createChart(container, {
    layout: {
      background: { color: '#11151a' },
      textColor: '#8ea0b5',
    },
    grid: {
      horzLines: { color: '#20262d' },
      vertLines: { color: '#20262d' },
    },
    rightPriceScale: { borderColor: '#2c343e' },
    timeScale: { borderColor: '#2c343e', timeVisible: true },
    crosshair: {
      horzLine: { color: '#6ee7b7' },
      vertLine: { color: '#6ee7b7' },
    },
  });
  const series = chart.addSeries(AreaSeries, {
    lineColor: '#6ee7b7',
    topColor: 'rgba(110, 231, 183, 0.28)',
    bottomColor: 'rgba(110, 231, 183, 0.01)',
    lineWidth: 2,
  });
  const handlers = new Map<
    (event: ChartCrosshairEvent) => void,
    MouseEventHandler<Time>
  >();

  return {
    setData(points) {
      series.setData(
        points.map((point) => ({
          time: Math.floor(point.time / 1_000) as UTCTimestamp,
          value: point.value,
        })),
      );
      chart.timeScale().fitContent();
    },
    subscribeCrosshairMove(handler) {
      const vendorHandler: MouseEventHandler<Time> = (event) => {
        handler({
          point: event.point ?? null,
          time:
            typeof event.time === 'number' ? event.time * 1_000 : null,
        });
      };
      handlers.set(handler, vendorHandler);
      chart.subscribeCrosshairMove(vendorHandler);
    },
    unsubscribeCrosshairMove(handler) {
      const vendorHandler = handlers.get(handler);
      if (vendorHandler) {
        chart.unsubscribeCrosshairMove(vendorHandler);
        handlers.delete(handler);
      }
    },
    resize(width, height) {
      chart.resize(width, height);
    },
    remove() {
      chart.remove();
    },
  };
}

function createTooltipIndex(
  points: readonly EquityPoint[],
): ReadonlyMap<number, TooltipPoint> {
  return new Map(
    points.map((point) => [
      point.time,
      {
        tradeId: point.tradeId,
        pnl: point.pnl,
      },
    ]),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function EquityChart({
  points,
  onTooltipChange,
  chartFactory = createDefaultChart,
}: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<EquityChartAdapter | null>(null);
  const tooltipIndexRef = useRef<ReadonlyMap<number, TooltipPoint>>(new Map());
  const onTooltipChangeRef = useRef(onTooltipChange);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    onTooltipChangeRef.current = onTooltipChange;
  }, [onTooltipChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let adapter: EquityChartAdapter;
    try {
      adapter = chartFactory(container);
    } catch {
      // An imperative vendor failure needs one React render to expose the fallback.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnavailable(true);
      return;
    }
    adapterRef.current = adapter;

    const handleCrosshairMove = (event: ChartCrosshairEvent): void => {
      if (event.point === null || event.time === null) {
        onTooltipChangeRef.current(HIDDEN_TOOLTIP);
        return;
      }

      const tooltipPoint = tooltipIndexRef.current.get(event.time);
      if (!tooltipPoint) {
        onTooltipChangeRef.current(HIDDEN_TOOLTIP);
        return;
      }

      const bounds = container.getBoundingClientRect();
      const maxX = bounds.width > 0 ? bounds.width : event.point.x;
      const maxY = bounds.height > 0 ? bounds.height : event.point.y;
      onTooltipChangeRef.current({
        visible: true,
        x: clamp(event.point.x, 0, maxX),
        y: clamp(event.point.y, 0, maxY),
        tradeId: tooltipPoint.tradeId,
        pnl: tooltipPoint.pnl,
      });
    };

    adapter.subscribeCrosshairMove(handleCrosshairMove);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(([entry]) => {
            if (entry) {
              adapter.resize(entry.contentRect.width, entry.contentRect.height);
            }
          });
    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      adapter.unsubscribeCrosshairMove(handleCrosshairMove);
      adapter.remove();
      adapterRef.current = null;
    };
  }, [chartFactory]);

  useEffect(() => {
    tooltipIndexRef.current = createTooltipIndex(points);
    adapterRef.current?.setData(points);
  }, [points]);

  if (unavailable) {
    return (
      <div className={styles.fallback} role="status">
        Chart unavailable
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div
        className={styles.surface}
        data-testid="chart-surface"
        ref={containerRef}
      />
    </div>
  );
}
