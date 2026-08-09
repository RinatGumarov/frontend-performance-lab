import { describe, expect, it, vi } from 'vitest';
import { HIDDEN_TOOLTIP } from './tooltip-types';
import { createTooltipStore } from './tooltip-store';

describe('createTooltipStore', () => {
  it('notifies only when a tooltip field changes', () => {
    const store = createTooltipStore(HIDDEN_TOOLTIP);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    store.set({ ...HIDDEN_TOOLTIP });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);

    store.set({ ...HIDDEN_TOOLTIP, visible: true, x: 20 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({
      ...HIDDEN_TOOLTIP,
      visible: true,
      x: 20,
    });
    expect(Object.isFrozen(store.getSnapshot())).toBe(true);
  });

  it('resets to the initial snapshot', () => {
    const initial = { ...HIDDEN_TOOLTIP, x: 12, y: 18 };
    const store = createTooltipStore(initial);
    store.set({ ...initial, visible: true, tradeId: 4, pnl: 12.5 });

    store.reset();

    expect(store.getSnapshot()).toEqual(initial);
  });

  it('notifies a stable listener list when a listener unsubscribes', () => {
    const store = createTooltipStore();
    const second = vi.fn();
    let unsubscribeSecond: () => void = () => undefined;
    store.subscribe(() => unsubscribeSecond());
    unsubscribeSecond = store.subscribe(second);

    store.set({ ...HIDDEN_TOOLTIP, visible: true });

    expect(second).toHaveBeenCalledOnce();
  });
});
