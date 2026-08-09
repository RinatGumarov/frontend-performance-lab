import { createRenderObserver } from '@riguran/render-observer';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { toEquitySeries } from '../domain/equity';
import { generateTrades } from '../domain/generate-trades';
import { BaselineDashboard } from '../features/dashboard/BaselineDashboard';
import { OptimizedDashboard } from '../features/dashboard/OptimizedDashboard';

const trades = generateTrades(1_000, 42);
const equity = toEquitySeries(trades);

function DashboardCatalog() {
  return null;
}

const meta = {
  title: 'Compositions/Dashboards',
  component: DashboardCatalog,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof DashboardCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Optimized: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <OptimizedDashboard
        equity={equity}
        observer={createRenderObserver()}
        trades={trades}
      />
    </div>
  ),
};

export const Baseline: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <BaselineDashboard
        equity={equity}
        observer={createRenderObserver()}
        trades={trades}
      />
    </div>
  ),
};
