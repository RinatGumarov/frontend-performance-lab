import { HIDDEN_TOOLTIP, type TooltipSnapshot } from './tooltip-types';

export interface TooltipStore {
  getSnapshot(): TooltipSnapshot;
  subscribe(listener: () => void): () => void;
  set(next: TooltipSnapshot): void;
  reset(): void;
}

function sameTooltip(
  left: TooltipSnapshot,
  right: TooltipSnapshot,
): boolean {
  return (
    left.visible === right.visible &&
    left.x === right.x &&
    left.y === right.y &&
    left.tradeId === right.tradeId &&
    left.pnl === right.pnl
  );
}

function freezeTooltip(snapshot: TooltipSnapshot): TooltipSnapshot {
  return Object.freeze({ ...snapshot });
}

export function createTooltipStore(
  initial: TooltipSnapshot = HIDDEN_TOOLTIP,
): TooltipStore {
  const initialSnapshot = freezeTooltip(initial);
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  const set = (next: TooltipSnapshot): void => {
    if (sameTooltip(snapshot, next)) {
      return;
    }

    snapshot = freezeTooltip(next);
    [...listeners].forEach((listener) => listener());
  };

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set,
    reset() {
      set(initialSnapshot);
    },
  };
}
