import { describe, expect, it } from 'vitest';
import { generateTrades } from './generate-trades';

describe('generateTrades', () => {
  it('is deterministic and preserves trade invariants', () => {
    const first = generateTrades(1_000, 42);
    const second = generateTrades(1_000, 42);

    expect(first).toEqual(second);
    expect(first).toHaveLength(1_000);
    expect(first.every((trade) => trade.closedAt > trade.openedAt)).toBe(true);
    expect(
      first.slice(1).every((trade, index) => {
        const previousTrade = first[index];
        return previousTrade !== undefined && trade.closedAt > previousTrade.closedAt;
      }),
    ).toBe(true);
    expect(first.every((trade) => trade.entryPrice > 0)).toBe(true);
    expect(first.every((trade) => trade.exitPrice > 0)).toBe(true);
    expect(first.every((trade) => trade.quantity > 0)).toBe(true);
    expect(first.at(-1)?.cumulativePnl).toBeCloseTo(
      first.reduce((sum, trade) => sum + trade.pnl, 0),
      8,
    );
  });

  it('changes the sequence when the seed changes', () => {
    const first = generateTrades(1_000, 7);
    const second = generateTrades(1_000, 8);

    expect(first).not.toEqual(second);
  });

  it('generates the full 100,000 trade dataset on demand', () => {
    const trades = generateTrades(100_000, 42);

    expect(trades).toHaveLength(100_000);
    expect(trades[0]?.id).toBe(1);
    expect(trades.at(-1)?.id).toBe(100_000);
  });
});
