import type { RenderObserver } from '@riguran/render-observer';
import { useEffect } from 'react';
import type { Trade } from '../../domain/trade';
import styles from './TradeTable.module.css';
import { TradeRow } from './TradeRow';

export interface BaselineTradeTableProps {
  trades: readonly Trade[];
  observer: RenderObserver;
}

export function BaselineTradeTable({
  trades,
  observer,
}: BaselineTradeTableProps) {
  useEffect(() => {
    observer.setMountedItems('trades', trades.length);
    return () => observer.setMountedItems('trades', 0);
  }, [observer, trades.length]);

  return (
    <div className={styles.viewport}>
      <div
        aria-label="Trade history"
        aria-rowcount={trades.length + 1}
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
          {trades.map((trade, index) => (
            <TradeRow
              ariaRowIndex={index + 2}
              key={trade.id}
              trade={trade}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
