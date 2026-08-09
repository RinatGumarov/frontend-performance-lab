import { vi } from 'vitest';
import type {
  ChartCrosshairEvent,
  EquityChartAdapter,
  EquityChartFactory,
} from './EquityChart';

export function createChartHarness() {
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
  const factory: EquityChartFactory = vi.fn(() => adapter);

  return {
    adapter,
    factory,
    emit(event: ChartCrosshairEvent) {
      crosshairHandler?.(event);
    },
  };
}
