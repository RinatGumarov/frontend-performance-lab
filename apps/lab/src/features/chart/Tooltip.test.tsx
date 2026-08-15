import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

interface Size {
  width: number;
  height: number;
}

function mockLayout(tooltip: Size, boundary: Size): void {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'OUTPUT' ? tooltip.width : boundary.width;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'OUTPUT' ? tooltip.height : boundary.height;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
    boundary.width,
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    boundary.height,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Tooltip', () => {
  it.each([
    {
      name: 'left and below when the preferred placement fits',
      anchor: { x: 200, y: 40 },
      boundary: { width: 320, height: 200 },
      expected: 'translate3d(56px, 56px, 0)',
    },
    {
      name: 'right when the preferred horizontal placement overflows',
      anchor: { x: 80, y: 40 },
      boundary: { width: 320, height: 200 },
      expected: 'translate3d(96px, 56px, 0)',
    },
    {
      name: 'above when the preferred vertical placement overflows',
      anchor: { x: 200, y: 180 },
      boundary: { width: 320, height: 200 },
      expected: 'translate3d(56px, 106px, 0)',
    },
    {
      name: 'inside the boundary when neither side can fit',
      anchor: { x: 50, y: 20 },
      boundary: { width: 100, height: 40 },
      expected: 'translate3d(0px, 0px, 0)',
    },
  ])('$name', ({ anchor, boundary, expected }) => {
    mockLayout({ width: 128, height: 58 }, boundary);

    render(
      <div>
        <Tooltip
          snapshot={{
            visible: true,
            x: anchor.x,
            y: anchor.y,
            tradeId: 47,
            pnl: 1.56,
          }}
        />
      </div>,
    );

    expect(screen.getByText('Trade #47').closest('output')).toHaveStyle({
      transform: expected,
    });
  });
});
