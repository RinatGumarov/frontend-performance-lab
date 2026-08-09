import { describe, expect, it } from 'vitest';
import { toEquitySeries } from './equity';
import { generateTrades } from './generate-trades';

describe('toEquitySeries', () => {
  it('creates one chronologically aligned point per trade', () => {
    const trades = generateTrades(1_000, 42);

    const equity = toEquitySeries(trades, 100_000);

    expect(equity).toHaveLength(trades.length);
    expect(equity[0]?.time).toBe(trades[0]?.closedAt);
    expect(equity.at(-1)?.time).toBe(trades.at(-1)?.closedAt);
    expect(equity.at(-1)?.value).toBeCloseTo(
      100_000 + trades.at(-1)!.cumulativePnl,
      8,
    );
  });

  it('returns an empty series for an empty trade collection', () => {
    expect(toEquitySeries([])).toEqual([]);
  });
});
