import type { RenderObserver } from '@riguran/render-observer';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import type { Trade } from '../../domain/trade';
import styles from './TradeTable.module.css';
import { TradeRow } from './TradeRow';

const ROW_HEIGHT = 44;
const OVERSCAN = 8;

export interface VirtualTradeTableProps {
  trades: readonly Trade[];
  observer: RenderObserver;
}

export function VirtualTradeTable({
  trades,
  observer,
}: VirtualTradeTableProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  // React Compiler is intentionally disabled; TanStack Virtual manages its own memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => trades[index]!.id,
    overscan: OVERSCAN,
  });
  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    observer.setMountedItems('trades', virtualItems.length);
    return () => observer.setMountedItems('trades', 0);
  }, [observer, virtualItems.length]);

  return (
    <div className={styles.viewport}>
      <div
        aria-label="Virtualized trade history"
        aria-rowcount={trades.length + 1}
        className={styles.virtualTable}
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
        <div
          className={styles.virtualBody}
          ref={scrollElementRef}
          role="rowgroup"
        >
          <div
            className={styles.virtualCanvas}
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualItems.map((virtualRow) => {
              const trade = trades[virtualRow.index];
              if (!trade) {
                return null;
              }

              return (
                <TradeRow
                  ariaRowIndex={virtualRow.index + 2}
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  trade={trade}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
