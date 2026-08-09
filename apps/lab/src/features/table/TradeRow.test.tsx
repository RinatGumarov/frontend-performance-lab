import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { generateTrades } from '../../domain/generate-trades';
import { TradeRow } from './TradeRow';

describe('TradeRow', () => {
  it('shows every trade field and a color-independent result label', () => {
    const trade = generateTrades(1_000, 42)[0]!;

    render(<TradeRow trade={trade} />);

    expect(screen.getByRole('row')).toHaveAttribute('aria-rowindex', '2');
    expect(screen.getByText('#1')).toBeVisible();
    expect(screen.getByText('Long')).toBeVisible();
    expect(
      screen.getByText(trade.pnl >= 0 ? 'Profit' : 'Loss'),
    ).toBeVisible();
  });
});
