import type { RenderObserver } from '@riguran/render-observer';
import { RenderProfiler } from '@riguran/render-observer/react';
import { memo } from 'react';
import type { EquityPoint, Trade } from '../domain/trade';
import type { EquityChartFactory } from '../features/chart/EquityChart';
import { BaselineDashboard } from '../features/dashboard/BaselineDashboard';
import { OptimizedDashboard } from '../features/dashboard/OptimizedDashboard';
import type { LabMode } from './lab-state';

interface DashboardStageProps {
  chartFactory?: EquityChartFactory;
  equity: readonly EquityPoint[];
  mode: LabMode;
  observer: RenderObserver;
  trades: readonly Trade[];
}

export const DashboardStage = memo(function DashboardStage({
  chartFactory,
  equity,
  mode,
  observer,
  trades,
}: DashboardStageProps) {
  const dashboard =
    mode === 'baseline' ? (
      <BaselineDashboard
        chartFactory={chartFactory}
        equity={equity}
        observer={observer}
        trades={trades}
      />
    ) : (
      <OptimizedDashboard
        chartFactory={chartFactory}
        equity={equity}
        observer={observer}
        trades={trades}
      />
    );

  return (
    <RenderProfiler id="dashboard" observer={observer}>
      {dashboard}
    </RenderProfiler>
  );
});
