import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { generateTrades } from '../../domain/generate-trades';
import { TradeRow } from './TradeRow';
import styles from './TradeTable.module.css';

const trades = generateTrades(1_000, 42);
const profitTrade = trades.find((trade) => trade.pnl >= 0)!;
const lossTrade = trades.find((trade) => trade.pnl < 0)!;

const meta = {
  title: 'Components/Trade row',
  component: TradeRow,
  decorators: [
    (Story) => (
      <div style={{ minWidth: 1024, padding: 24 }}>
        <div className={styles.viewport}>
          <div
            aria-label="Trade history"
            aria-rowcount={2}
            className={styles.table}
            role="table"
          >
            <div className={styles.header} role="row">
              <span className={styles.cell} role="columnheader">
                Trade
              </span>
              <span className={styles.cell} role="columnheader">
                Side
              </span>
              <span className={styles.cell} role="columnheader">
                Entry
              </span>
              <span className={styles.cell} role="columnheader">
                Exit
              </span>
              <span className={styles.cell} role="columnheader">
                Quantity
              </span>
              <span className={styles.cell} role="columnheader">
                P&amp;L
              </span>
              <span className={styles.cell} role="columnheader">
                Cumulative P&amp;L
              </span>
            </div>
            <div role="rowgroup">
              <Story />
            </div>
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof TradeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const verifyDemoRow: NonNullable<Story['play']> = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  const rows = canvas.getAllByRole('row');
  await expect(rows[1]).toHaveAttribute('aria-rowindex', '2');
};

export const Profit: Story = {
  args: { ariaRowIndex: 2, trade: profitTrade },
  play: verifyDemoRow,
};

export const Loss: Story = {
  args: { ariaRowIndex: 2, trade: lossTrade },
  play: verifyDemoRow,
};
