import styles from './Tooltip.module.css';
import type { TooltipSnapshot } from './tooltip-types';

const pnlFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'always',
});

export interface TooltipProps {
  snapshot: TooltipSnapshot;
}

export function Tooltip({ snapshot }: TooltipProps) {
  if (!snapshot.visible) {
    return null;
  }

  const pnl = snapshot.pnl ?? 0;

  return (
    <output
      aria-live="polite"
      className={styles.tooltip}
      style={{ transform: `translate3d(${snapshot.x}px, ${snapshot.y}px, 0)` }}
    >
      <span className={styles.label}>Trade #{snapshot.tradeId ?? '—'}</span>
      <strong className={pnl >= 0 ? styles.positive : styles.negative}>
        {snapshot.pnl === null ? 'No change' : pnlFormatter.format(pnl)}
      </strong>
    </output>
  );
}
