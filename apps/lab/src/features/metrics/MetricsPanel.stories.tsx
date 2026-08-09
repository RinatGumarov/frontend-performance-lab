import { createRenderObserver } from '@riguran/render-observer';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MetricsPanel } from './MetricsPanel';

function populatedObserver() {
  const observer = createRenderObserver({
    mode: 'optimized',
    datasetSize: 100_000,
  });
  observer.markRender('dashboard');
  observer.markRender('tooltip');
  observer.setMountedItems('trades', 22);
  observer.recordCommit(8.4);
  observer.setFrameSample({ sampleCount: 120, gapCount: 1, maxGapMs: 36.2 });
  return observer;
}

const meta = {
  title: 'Components/Metrics panel',
  component: MetricsPanel,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof MetricsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { observer: createRenderObserver() },
};

export const Populated: Story = {
  args: { observer: populatedObserver() },
};
