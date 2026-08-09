import { describe, expect, it, vi } from 'vitest';
import { createRenderObserver } from '../src/observer';

describe('createRenderObserver', () => {
  it('publishes immutable snapshots and skips semantic no-ops', () => {
    const observer = createRenderObserver({ mode: 'optimized' });
    const listener = vi.fn();
    observer.subscribe(listener);
    const before = observer.getSnapshot();

    observer.setContext({ mode: 'optimized' });

    expect(listener).not.toHaveBeenCalled();
    expect(observer.getSnapshot()).toBe(before);

    observer.markRender('dashboard');

    const after = observer.getSnapshot();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(after.renders.dashboard).toBe(1);
    expect(Object.isFrozen(after)).toBe(true);
    expect(Object.isFrozen(after.context)).toBe(true);
    expect(Object.isFrozen(after.renders)).toBe(true);
    expect(Object.isFrozen(after.mountedItems)).toBe(true);
    expect(Object.isFrozen(after.profiler)).toBe(true);
    expect(Object.isFrozen(after.frames)).toBe(true);
  });

  it('treats contexts with the same entries as equal regardless of key order', () => {
    const observer = createRenderObserver({
      datasetSize: 100_000,
      mode: 'optimized',
    });
    const before = observer.getSnapshot();

    observer.setContext({ mode: 'optimized', datasetSize: 100_000 });

    expect(observer.getSnapshot()).toBe(before);
  });

  it('resets measurements while preserving context by default', () => {
    const observer = createRenderObserver({
      mode: 'baseline',
      datasetSize: 10_000,
    });
    observer.markRender('dashboard');
    observer.setMountedItems('trades', 10_000);
    observer.recordCommit(4.25);
    observer.setFrameSample({ sampleCount: 3, gapCount: 1, maxGapMs: 48 });

    observer.reset();

    expect(observer.getSnapshot()).toEqual({
      context: { mode: 'baseline', datasetSize: 10_000 },
      renders: {},
      mountedItems: {},
      profiler: { commitCount: 0, totalDurationMs: 0 },
      frames: { sampleCount: 0, gapCount: 0, maxGapMs: 0 },
    });
  });

  it('supports clearing context during reset', () => {
    const observer = createRenderObserver({ mode: 'baseline' });

    observer.reset({ preserveContext: false });

    expect(observer.getSnapshot().context).toEqual({});
  });

  it('notifies a stable listener snapshot when a listener unsubscribes', () => {
    const observer = createRenderObserver();
    const secondListener = vi.fn();
    let unsubscribeSecond: () => void = () => undefined;
    const firstListener = vi.fn(() => unsubscribeSecond());
    observer.subscribe(firstListener);
    unsubscribeSecond = observer.subscribe(secondListener);

    observer.markRender('dashboard');

    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid measurements without publishing', () => {
    const observer = createRenderObserver();
    const listener = vi.fn();
    observer.subscribe(listener);

    expect(() => observer.setMountedItems('trades', -1)).toThrow(RangeError);
    expect(() => observer.setMountedItems('trades', 1.5)).toThrow(RangeError);
    expect(() => observer.recordCommit(Number.NaN)).toThrow(RangeError);
    expect(() => observer.recordCommit(-0.01)).toThrow(RangeError);
    expect(() =>
      observer.setFrameSample({ sampleCount: 1, gapCount: 2, maxGapMs: 16 }),
    ).toThrow(RangeError);
    expect(listener).not.toHaveBeenCalled();
  });
});
