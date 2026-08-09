export type RenderContextValue = string | number | boolean;

export type RenderContext = Readonly<Record<string, RenderContextValue>>;

export interface FrameSample {
  sampleCount: number;
  gapCount: number;
  maxGapMs: number;
}

export interface RenderSnapshot {
  context: RenderContext;
  renders: Readonly<Record<string, number>>;
  mountedItems: Readonly<Record<string, number>>;
  profiler: Readonly<{
    commitCount: number;
    totalDurationMs: number;
  }>;
  frames: Readonly<FrameSample>;
}

export interface RenderObserver {
  subscribe(listener: () => void): () => void;
  getSnapshot(): RenderSnapshot;
  setContext(context: RenderContext): void;
  markRender(componentId: string): void;
  setMountedItems(collectionId: string, count: number): void;
  recordCommit(durationMs: number): void;
  setFrameSample(sample: FrameSample): void;
  reset(options?: { preserveContext?: boolean }): void;
}

export interface FrameScheduler {
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

export interface FrameSampleOptions {
  scheduler: FrameScheduler;
  frameCount?: number;
  gapThresholdMs?: number;
  onComplete(sample: FrameSample): void;
  onError?(error: Error): void;
}
