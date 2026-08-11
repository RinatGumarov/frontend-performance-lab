import { useLayoutEffect, useRef } from 'react';
import styles from './Tooltip.module.css';
import type { TooltipSnapshot } from './tooltip-types';

const CURSOR_GAP = 16;

interface Size {
  width: number;
  height: number;
}

interface TooltipLayout {
  tooltip: Size;
  boundary: Size;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fitAxis(
  preferred: number,
  fallback: number,
  tooltipSize: number,
  boundarySize: number,
): number {
  const maximum = Math.max(0, boundarySize - tooltipSize);
  const candidate =
    preferred >= 0 && preferred <= maximum ? preferred : fallback;

  return clamp(candidate, 0, maximum);
}

function resolveTooltipPosition(
  snapshot: TooltipSnapshot,
  layout: TooltipLayout,
): { x: number; y: number } {
  const x = fitAxis(
    snapshot.x - CURSOR_GAP - layout.tooltip.width,
    snapshot.x + CURSOR_GAP,
    layout.tooltip.width,
    layout.boundary.width,
  );
  const y = fitAxis(
    snapshot.y + CURSOR_GAP,
    snapshot.y - CURSOR_GAP - layout.tooltip.height,
    layout.tooltip.height,
    layout.boundary.height,
  );

  return { x, y };
}

function positionTooltip(
  element: HTMLOutputElement,
  snapshot: TooltipSnapshot,
  layout: TooltipLayout,
): void {
  const position = resolveTooltipPosition(snapshot, layout);
  element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
}

const pnlFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'always',
});

export interface TooltipProps {
  snapshot: TooltipSnapshot;
}

export function Tooltip({ snapshot }: TooltipProps) {
  const tooltipRef = useRef<HTMLOutputElement>(null);
  const layoutRef = useRef<TooltipLayout | null>(null);
  const snapshotRef = useRef<TooltipSnapshot>(snapshot);

  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
    const tooltip = tooltipRef.current;
    const layout = layoutRef.current;
    if (snapshot.visible && tooltip && layout) {
      positionTooltip(tooltip, snapshot, layout);
    }
  }, [snapshot]);

  useLayoutEffect(() => {
    if (!snapshot.visible) {
      layoutRef.current = null;
      return;
    }

    const tooltip = tooltipRef.current;
    const boundary = tooltip?.parentElement;
    if (!tooltip || !boundary) {
      return;
    }

    // Geometry changes are rare; cursor moves reuse this cached layout.
    const measure = (): void => {
      const layout = {
        tooltip: {
          width: tooltip.offsetWidth,
          height: tooltip.offsetHeight,
        },
        boundary: {
          width: boundary.clientWidth,
          height: boundary.clientHeight,
        },
      };
      layoutRef.current = layout;
      positionTooltip(tooltip, snapshotRef.current, layout);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(tooltip);
    resizeObserver.observe(boundary);

    return () => {
      resizeObserver.disconnect();
      layoutRef.current = null;
    };
  }, [snapshot.visible]);

  if (!snapshot.visible) {
    return null;
  }

  const pnl = snapshot.pnl ?? 0;

  return (
    <output
      aria-live="polite"
      className={styles.tooltip}
      ref={tooltipRef}
    >
      <span className={styles.label}>Trade #{snapshot.tradeId ?? '—'}</span>
      <strong className={pnl >= 0 ? styles.positive : styles.negative}>
        {snapshot.pnl === null ? 'No change' : pnlFormatter.format(pnl)}
      </strong>
    </output>
  );
}
