import { describe, expect, it } from 'vitest';
import type { Trade } from './trade';
import { toBoundedEquitySeries, toEquitySeries } from './equity';
import { generateTrades } from './generate-trades';

function trade(
  id: number,
  cumulativePnl: number,
  pnl = cumulativePnl,
): Trade {
  return {
    id,
    openedAt: id * 1_000,
    closedAt: id * 1_000 + 500,
    side: 'long',
    entryPrice: 100,
    exitPrice: 101,
    quantity: 1,
    pnl,
    cumulativePnl,
  };
}

describe('toEquitySeries', () => {
  it('creates one chronologically aligned point per trade', () => {
    const trades = generateTrades(1_000, 42);

    const equity = toEquitySeries(trades, 100_000);

    expect(equity).toHaveLength(trades.length);
    expect(equity[0]?.time).toBe(trades[0]?.closedAt);
    expect(equity[0]?.tradeId).toBe(trades[0]?.id);
    expect(equity[0]?.pnl).toBe(trades[0]?.pnl);
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

describe('toBoundedEquitySeries', () => {
  it('returns every source point when the collection fits the limit', () => {
    const trades = [trade(1, 2), trade(2, -1, -3), trade(3, 4, 5)];

    expect(toBoundedEquitySeries(trades, 4)).toEqual([
      { time: 1_500, value: 100_002, tradeId: 1, pnl: 2 },
      { time: 2_500, value: 99_999, tradeId: 2, pnl: -3 },
      { time: 3_500, value: 100_004, tradeId: 3, pnl: 5 },
    ]);
  });

  it('preserves chronological bucket extrema and both endpoints', () => {
    const trades = [
      trade(1, 0),
      trade(2, 5),
      trade(3, -7),
      trade(4, 2),
      trade(5, 3),
      trade(6, 12),
      trade(7, -4),
      trade(8, 1),
    ];

    const sampled = toBoundedEquitySeries(trades, 6);

    expect(sampled.map((point) => point.tradeId)).toEqual([1, 2, 3, 6, 7, 8]);
    expect(sampled.map((point) => point.value)).toEqual([
      100_000, 100_005, 99_993, 100_012, 99_996, 100_001,
    ]);
  });

  it('bounds the 100K series while preserving chronological endpoints', () => {
    const trades = generateTrades(100_000, 42);

    const sampled = toBoundedEquitySeries(trades, 2_000);

    expect(sampled.length).toBeLessThanOrEqual(2_000);
    expect(sampled[0]?.tradeId).toBe(1);
    expect(sampled.at(-1)?.tradeId).toBe(100_000);
    expect(
      sampled.slice(1).every((point, index) => {
        const previous = sampled[index];
        return previous !== undefined && point.time > previous.time;
      }),
    ).toBe(true);
  });

  it('returns an empty series and rejects limits that cannot preserve extrema', () => {
    expect(toBoundedEquitySeries([], 4)).toEqual([]);
    expect(() => toBoundedEquitySeries([trade(1, 0)], 3)).toThrow(RangeError);
  });
});
