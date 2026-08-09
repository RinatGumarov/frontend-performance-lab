import type { FrameSampleOptions } from './types';

const DEFAULT_FRAME_COUNT = 60;
const DEFAULT_GAP_THRESHOLD_MS = 32;

function validateOptions(frameCount: number, gapThresholdMs: number): void {
  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    throw new RangeError('frameCount must be a positive integer');
  }
  if (!Number.isFinite(gapThresholdMs) || gapThresholdMs < 0) {
    throw new RangeError('gapThresholdMs must be a non-negative finite number');
  }
}

export function startFrameSample({
  scheduler,
  frameCount = DEFAULT_FRAME_COUNT,
  gapThresholdMs = DEFAULT_GAP_THRESHOLD_MS,
  onComplete,
  onError,
}: FrameSampleOptions): () => void {
  try {
    validateOptions(frameCount, gapThresholdMs);
  } catch (error) {
    const validationError = error as RangeError;
    if (onError) {
      onError(validationError);
      return () => undefined;
    }
    throw validationError;
  }

  let active = true;
  let currentHandle: number | null = null;
  let previousTimestamp: number | null = null;
  let sampleCount = 0;
  let gapCount = 0;
  let maxGapMs = 0;

  const scheduleNext = (): void => {
    currentHandle = scheduler.request(sampleFrame);
  };

  const sampleFrame = (timestamp: number): void => {
    if (!active) {
      return;
    }

    currentHandle = null;
    sampleCount += 1;

    if (previousTimestamp !== null) {
      const gapMs = timestamp - previousTimestamp;
      maxGapMs = Math.max(maxGapMs, gapMs);
      if (gapMs > gapThresholdMs) {
        gapCount += 1;
      }
    }

    previousTimestamp = timestamp;

    if (sampleCount === frameCount) {
      active = false;
      onComplete({ sampleCount, gapCount, maxGapMs });
      return;
    }

    scheduleNext();
  };

  scheduleNext();

  return () => {
    if (!active) {
      return;
    }
    active = false;
    if (currentHandle !== null) {
      scheduler.cancel(currentHandle);
      currentHandle = null;
    }
  };
}
