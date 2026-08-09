import type { EquityPoint, Trade } from './trade';

const DEFAULT_INITIAL_CAPITAL = 100_000;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toEquitySeries(
  trades: readonly Trade[],
  initialCapital = DEFAULT_INITIAL_CAPITAL,
): EquityPoint[] {
  return trades.map((trade) => ({
    time: trade.closedAt,
    value: roundCurrency(initialCapital + trade.cumulativePnl),
  }));
}
