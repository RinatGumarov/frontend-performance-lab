import type { RenderObserver } from '@riguran/render-observer';
import { useRenderMarker } from '@riguran/render-observer/react';
import { useState, useSyncExternalStore } from 'react';
import type { EquityPoint, Trade } from '../../domain/trade';
import {
  EquityChart,
  type EquityChartFactory,
} from '../chart/EquityChart';
import { Tooltip } from '../chart/Tooltip';
import {
  createTooltipStore,
  type TooltipStore,
} from '../chart/tooltip-store';
import { VirtualTradeTable } from '../table/VirtualTradeTable';
import styles from './Dashboard.module.css';

interface OptimizedTooltipProps {
  observer: RenderObserver;
  store: TooltipStore;
}

function OptimizedTooltip({ observer, store }: OptimizedTooltipProps) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useRenderMarker(observer, 'tooltip');

  return <Tooltip snapshot={snapshot} />;
}

export interface OptimizedDashboardProps {
  trades: readonly Trade[];
  equity: readonly EquityPoint[];
  observer: RenderObserver;
  chartFactory?: EquityChartFactory;
}

export function OptimizedDashboard({
  trades,
  equity,
  observer,
  chartFactory,
}: OptimizedDashboardProps) {
  const [tooltipStore] = useState(createTooltipStore);
  useRenderMarker(observer, 'dashboard');

  return (
    <section aria-label="Optimized dashboard" className={styles.dashboard}>
      <div className={styles.chart}>
        <EquityChart
          chartFactory={chartFactory}
          onTooltipChange={tooltipStore.set}
          points={equity}
        />
        <OptimizedTooltip observer={observer} store={tooltipStore} />
      </div>
      <VirtualTradeTable observer={observer} trades={trades} />
    </section>
  );
}
