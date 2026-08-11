import { createRenderObserver } from '@riguran/render-observer';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateTrades } from '../../domain/generate-trades';
import { mockElementSize } from '../../test/element-size';
import { VirtualTradeTable } from './VirtualTradeTable';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('VirtualTradeTable', () => {
  it('mounts only the visible trade window', async () => {
    mockElementSize({ height: 600, width: 1_200 });
    const observer = createRenderObserver();
    const trades = generateTrades(10_000, 42);

    render(<VirtualTradeTable observer={observer} trades={trades} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('trade-row').length).toBeGreaterThan(0);
    });
    const mountedRows = screen.getAllByTestId('trade-row').length;

    expect(mountedRows).toBeLessThanOrEqual(80);
    expect(screen.getByRole('table')).toHaveAttribute(
      'aria-rowcount',
      '10001',
    );
    expect(observer.getSnapshot().mountedItems.trades).toBe(mountedRows);
  });
});
