import type { CSSProperties } from 'react';
import type { Trade } from '../../domain/trade';
import styles from './TradeTable.module.css';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export interface TradeRowProps {
  trade: Trade;
  ariaRowIndex?: number;
  style?: CSSProperties;
}

export function TradeRow({
  trade,
  ariaRowIndex = trade.id + 1,
  style,
}: TradeRowProps) {
  const isProfit = trade.pnl >= 0;
  const resultLabel = isProfit ? 'Profit' : 'Loss';
  const sideLabel = trade.side === 'long' ? 'Long' : 'Short';

  return (
    <div
      aria-rowindex={ariaRowIndex}
      className={styles.row}
      data-testid="trade-row"
      role="row"
      style={style}
    >
      <span className={styles.cell} role="cell">
        #{trade.id}
      </span>
      <span className={`${styles.cell} ${styles.side}`} role="cell">
        {sideLabel}
      </span>
      <span className={styles.cell} role="cell">
        {priceFormatter.format(trade.entryPrice)}
      </span>
      <span className={styles.cell} role="cell">
        {priceFormatter.format(trade.exitPrice)}
      </span>
      <span className={styles.cell} role="cell">
        {quantityFormatter.format(trade.quantity)}
      </span>
      <span className={styles.cell} role="cell">
        <span
          className={`${styles.result} ${isProfit ? styles.profit : styles.loss}`}
        >
          <span className={styles.resultLabel}>{resultLabel}</span>
          {priceFormatter.format(trade.pnl)}
        </span>
      </span>
      <span className={styles.cell} role="cell">
        {priceFormatter.format(trade.cumulativePnl)}
      </span>
    </div>
  );
}
