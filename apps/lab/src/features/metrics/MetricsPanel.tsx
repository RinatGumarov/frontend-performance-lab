import type { RenderObserver } from '@riguran/render-observer';
import { useRenderSnapshot } from '@riguran/render-observer/react';
import styles from './MetricsPanel.module.css';

export interface MetricsPanelProps {
  observer: RenderObserver;
}

export function MetricsPanel({ observer }: MetricsPanelProps) {
  const snapshot = useRenderSnapshot(observer);
  const hasFrameSample = snapshot.frames.sampleCount > 0;
  const metrics = [
    ['Dashboard renders', snapshot.renders.dashboard ?? 0],
    ['Tooltip renders', snapshot.renders.tooltip ?? 0],
    ['Mounted rows', snapshot.mountedItems.trades ?? 0],
    ['Profiler commits', snapshot.profiler.commitCount],
    ['Commit duration', `${snapshot.profiler.totalDurationMs.toFixed(1)} ms`],
    [
      'Frame samples',
      hasFrameSample ? snapshot.frames.sampleCount : 'Not sampled',
    ],
    ['rAF gaps', hasFrameSample ? snapshot.frames.gapCount : 'Not sampled'],
    [
      'Maximum gap',
      hasFrameSample
        ? `${snapshot.frames.maxGapMs.toFixed(1)} ms`
        : 'Not sampled',
    ],
  ] as const;

  return (
    <aside aria-label="Live rendering evidence" className={styles.panel}>
      <h2 className={styles.heading}>Live rendering evidence</h2>
      <dl className={styles.grid}>
        {metrics.map(([label, value]) => (
          <div className={styles.metric} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        Local observation; not a universal guarantee. Compare both modes in the
        same browser and viewport.
      </p>
    </aside>
  );
}
