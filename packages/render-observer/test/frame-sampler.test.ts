import { describe, expect, it, vi } from 'vitest';
import { startFrameSample } from '../src/frame-sampler';
import type { FrameScheduler } from '../src/types';

function createSchedulerHarness() {
  const callbacks = new Map<number, (timestamp: number) => void>();
  let nextHandle = 0;
  const scheduler: FrameScheduler = {
    request(callback) {
      nextHandle += 1;
      callbacks.set(nextHandle, callback);
      return nextHandle;
    },
    cancel(handle) {
      callbacks.delete(handle);
    },
  };

  return {
    callbacks,
    scheduler,
    run(handle: number, timestamp: number) {
      const callback = callbacks.get(handle);
      callbacks.delete(handle);
      callback?.(timestamp);
    },
  };
}

describe('startFrameSample', () => {
  it('counts gaps across the requested number of frames', () => {
    const harness = createSchedulerHarness();
    const onComplete = vi.fn();

    const cancel = startFrameSample({
      scheduler: harness.scheduler,
      frameCount: 3,
      gapThresholdMs: 32,
      onComplete,
    });

    harness.run(1, 0);
    harness.run(2, 16);
    harness.run(3, 64);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({
      sampleCount: 3,
      gapCount: 1,
      maxGapMs: 48,
    });
    expect(harness.callbacks.size).toBe(0);

    cancel();
    cancel();
    expect(harness.callbacks.size).toBe(0);
  });

  it('stops scheduling when cancelled', () => {
    const harness = createSchedulerHarness();
    const onComplete = vi.fn();
    const cancel = startFrameSample({
      scheduler: harness.scheduler,
      frameCount: 3,
      onComplete,
    });

    harness.run(1, 0);
    cancel();
    harness.run(2, 16);

    expect(harness.callbacks.size).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it.each([
    { frameCount: 0, gapThresholdMs: 32 },
    { frameCount: 1.5, gapThresholdMs: 32 },
    { frameCount: 3, gapThresholdMs: -1 },
    { frameCount: 3, gapThresholdMs: Number.POSITIVE_INFINITY },
  ])('reports invalid options without scheduling: %o', (options) => {
    const harness = createSchedulerHarness();
    const onError = vi.fn();

    const cancel = startFrameSample({
      scheduler: harness.scheduler,
      ...options,
      onComplete: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(RangeError);
    expect(harness.callbacks.size).toBe(0);
    expect(cancel).toEqual(expect.any(Function));
  });
});
