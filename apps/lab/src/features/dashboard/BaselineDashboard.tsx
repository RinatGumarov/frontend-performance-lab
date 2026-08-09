import type { RenderObserver } from '@riguran/render-observer';
import { useRenderMarker } from '@riguran/render-observer/react';
import { useState } from 'react';
import type { EquityPoint, Trade } from '../../domain/trade';
import {
  EquityChart,
  type EquityChartFactory,
} from '../chart/EquityChart';
import { Tooltip } from '../chart/Tooltip';
import {
  HIDDEN_TOOLTIP,
  type TooltipSnapshot,
} from '../chart/tooltip-types';
import { BaselineTradeTable } from '../table/BaselineTradeTable';
import styles from './Dashboard.module.css';

export interface BaselineDashboardProps {
  trades: readonly Trade[];
  equity: readonly EquityPoint[];
  observer: RenderObserver;
  chartFactory?: EquityChartFactory;
}

export function BaselineDashboard({
  trades,
  equity,
  observer,
  chartFactory,
}: BaselineDashboardProps) {
  const [tooltip, setTooltip] = useState<TooltipSnapshot>(HIDDEN_TOOLTIP);
  useRenderMarker(observer, 'dashboard');

  return (
    <section aria-label="Baseline dashboard" className={styles.dashboard}>
      <div className={styles.chart}>
        <EquityChart
          chartFactory={chartFactory}
          onTooltipChange={setTooltip}
          points={equity}
        />
        <Tooltip snapshot={tooltip} />
      </div>
      <BaselineTradeTable observer={observer} trades={trades} />
    </section>
  );
}
