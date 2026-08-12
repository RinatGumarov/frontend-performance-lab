import {
  startFrameSample,
  type FrameScheduler,
  type RenderObserver,
} from '@riguran/render-observer';
import { useCallback, useEffect, useRef, useState } from 'react';

export type InteractionSampleStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'error';

const browserFrameScheduler: FrameScheduler = {
  request(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(() => callback(performance.now()), 16);
  },
  cancel(handle) {
    if (typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(handle);
    } else {
      window.clearTimeout(handle);
    }
  },
};

interface SampleState {
  key: string;
  status: InteractionSampleStatus;
}

export function useInteractionSample(
  observer: RenderObserver,
  sampleKey: string,
  scheduler: FrameScheduler = browserFrameScheduler,
) {
  const cancelRef = useRef<(() => void) | null>(null);
  const [sample, setSample] = useState<SampleState>({
    key: sampleKey,
    status: 'idle',
  });
  const status = sample.key === sampleKey ? sample.status : 'idle';

  useEffect(() => {
    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [sampleKey]);

  const run = useCallback(() => {
    cancelRef.current?.();
    setSample({ key: sampleKey, status: 'running' });

    try {
      cancelRef.current = startFrameSample({
        scheduler,
        frameCount: 120,
        gapThresholdMs: 32,
        onComplete(frameSample) {
          observer.setFrameSample(frameSample);
          cancelRef.current = null;
          setSample((current) =>
            current.key === sampleKey
              ? { key: sampleKey, status: 'complete' }
              : current,
          );
        },
        onError() {
          cancelRef.current = null;
          setSample((current) =>
            current.key === sampleKey
              ? { key: sampleKey, status: 'error' }
              : current,
          );
        },
      });
    } catch {
      cancelRef.current = null;
      setSample({ key: sampleKey, status: 'error' });
    }
  }, [observer, sampleKey, scheduler]);

  return { run, status } as const;
}
