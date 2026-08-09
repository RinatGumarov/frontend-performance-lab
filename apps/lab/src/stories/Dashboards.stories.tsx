import { createRenderObserver } from '@riguran/render-observer';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { toEquitySeries } from '../domain/equity';
import { generateTrades } from '../domain/generate-trades';
import { BaselineDashboard } from '../features/dashboard/BaselineDashboard';
import { OptimizedDashboard } from '../features/dashboard/OptimizedDashboard';

const optimizedTrades = generateTrades(1_000, 42).slice(0, 250);
const baselineTrades = generateTrades(1_000, 42).slice(0, 48);
const optimizedEquity = toEquitySeries(optimizedTrades);
const baselineEquity = toEquitySeries(baselineTrades);

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
        equity={optimizedEquity}
        observer={createRenderObserver()}
        trades={optimizedTrades}
      />
    </div>
  ),
};

export const Baseline: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Baseline mounts every row in the DOM. This story caps at 48 rows so the canvas stays responsive in Storybook.',
      },
    },
  },
  render: () => (
    <div style={{ padding: 24 }}>
      <BaselineDashboard
        equity={baselineEquity}
        observer={createRenderObserver()}
        trades={baselineTrades}
      />
    </div>
  ),
};
