import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './Tooltip';
import { HIDDEN_TOOLTIP } from './tooltip-types';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: 180, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {
  args: { snapshot: HIDDEN_TOOLTIP },
};

export const Profit: Story = {
  args: {
    snapshot: {
      visible: true,
      x: 24,
      y: 24,
      tradeId: 82,
      pnl: 143.28,
    },
  },
};

export const Loss: Story = {
  args: {
    snapshot: {
      visible: true,
      x: 24,
      y: 24,
      tradeId: 83,
      pnl: -38.46,
    },
  },
};
