import {
  Profiler,
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import type { RenderObserver, RenderSnapshot } from './types';

export function useRenderSnapshot(observer: RenderObserver): RenderSnapshot {
  return useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot,
  );
}

export function useRenderMarker(observer: RenderObserver, id: string): void {
  useLayoutEffect(() => {
    observer.markRender(id);
  });
}

export interface RenderProfilerProps extends PropsWithChildren {
  observer: RenderObserver;
  id: string;
}

export function RenderProfiler({
  children,
  id,
  observer,
}: RenderProfilerProps) {
  return (
    <Profiler
      id={id}
      onRender={(_id, _phase, actualDuration) => {
        observer.recordCommit(actualDuration);
      }}
    >
      {children}
    </Profiler>
  );
}
