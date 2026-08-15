export const DATASET_SIZES = [1_000, 10_000, 100_000] as const;

export const BASELINE_MAX_ROWS = 10_000;

export type DatasetSize = (typeof DATASET_SIZES)[number];

export interface Trade {
  id: number;
  openedAt: number;
  closedAt: number;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  cumulativePnl: number;
}

export interface EquityPoint {
  time: number;
  value: number;
  tradeId: number;
  pnl: number;
}
