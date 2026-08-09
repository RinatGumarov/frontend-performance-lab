import type { Meta, StoryObj } from '@storybook/react-vite';
import { generateTrades } from '../../domain/generate-trades';
import { TradeRow } from './TradeRow';

const trades = generateTrades(1_000, 42);
const profitTrade = trades.find((trade) => trade.pnl >= 0)!;
const lossTrade = trades.find((trade) => trade.pnl < 0)!;

const meta = {
  title: 'Components/Trade row',
  component: TradeRow,
  decorators: [
    (Story) => (
      <div style={{ minWidth: 1024, padding: 24 }} role="table">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TradeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Profit: Story = {
  args: { trade: profitTrade },
};

export const Loss: Story = {
  args: { trade: lossTrade },
};
