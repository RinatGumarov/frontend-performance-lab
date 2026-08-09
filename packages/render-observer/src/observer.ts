import type {
  FrameSample,
  RenderContext,
  RenderObserver,
  RenderSnapshot,
} from './types';

const EMPTY_FRAME_SAMPLE: FrameSample = {
  sampleCount: 0,
  gapCount: 0,
  maxGapMs: 0,
};

function freezeSnapshot(snapshot: RenderSnapshot): RenderSnapshot {
  return Object.freeze({
    context: Object.freeze({ ...snapshot.context }),
    renders: Object.freeze({ ...snapshot.renders }),
    mountedItems: Object.freeze({ ...snapshot.mountedItems }),
    profiler: Object.freeze({ ...snapshot.profiler }),
    frames: Object.freeze({ ...snapshot.frames }),
  });
}

function createInitialSnapshot(context: RenderContext): RenderSnapshot {
  return {
    context,
    renders: {},
    mountedItems: {},
    profiler: { commitCount: 0, totalDurationMs: 0 },
    frames: EMPTY_FRAME_SAMPLE,
  };
}

function sameContext(left: RenderContext, right: RenderContext): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => left[key] === right[key])
  );
}

function sameFrameSample(left: FrameSample, right: FrameSample): boolean {
  return (
    left.sampleCount === right.sampleCount &&
    left.gapCount === right.gapCount &&
    left.maxGapMs === right.maxGapMs
  );
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}

function validateFrameSample(sample: FrameSample): void {
  assertNonNegativeInteger(sample.sampleCount, 'sampleCount');
  assertNonNegativeInteger(sample.gapCount, 'gapCount');
  assertNonNegativeFinite(sample.maxGapMs, 'maxGapMs');

  const comparableGapCount = Math.max(0, sample.sampleCount - 1);
  if (sample.gapCount > comparableGapCount) {
    throw new RangeError('gapCount cannot exceed the number of comparable gaps');
  }
}

export function createRenderObserver(
  initialContext: RenderContext = {},
): RenderObserver {
  let snapshot = freezeSnapshot(createInitialSnapshot(initialContext));
  const listeners = new Set<() => void>();

  const publish = (next: RenderSnapshot): void => {
    snapshot = freezeSnapshot(next);
    [...listeners].forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    setContext(context) {
      if (!sameContext(snapshot.context, context)) {
        publish({ ...snapshot, context });
      }
    },
    markRender(componentId) {
      publish({
        ...snapshot,
        renders: {
          ...snapshot.renders,
          [componentId]: (snapshot.renders[componentId] ?? 0) + 1,
        },
      });
    },
    setMountedItems(collectionId, count) {
      assertNonNegativeInteger(count, 'count');
      if (snapshot.mountedItems[collectionId] !== count) {
        publish({
          ...snapshot,
          mountedItems: { ...snapshot.mountedItems, [collectionId]: count },
        });
      }
    },
    recordCommit(durationMs) {
      assertNonNegativeFinite(durationMs, 'durationMs');
      publish({
        ...snapshot,
        profiler: {
          commitCount: snapshot.profiler.commitCount + 1,
          totalDurationMs: snapshot.profiler.totalDurationMs + durationMs,
        },
      });
    },
    setFrameSample(sample) {
      validateFrameSample(sample);
      if (!sameFrameSample(snapshot.frames, sample)) {
        publish({ ...snapshot, frames: sample });
      }
    },
    reset({ preserveContext = true } = {}) {
      publish(
        createInitialSnapshot(preserveContext ? snapshot.context : {}),
      );
    },
  };
}
