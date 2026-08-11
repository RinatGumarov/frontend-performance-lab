import { act, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createRenderObserver } from '../src/observer';
import {
  RenderProfiler,
  useRenderMarker,
  useRenderSnapshot,
} from '../src/react';
import type { RenderObserver } from '../src/types';

function Marked({ observer }: { observer: RenderObserver }) {
  useRenderMarker(observer, 'probe');
  return <output>mounted</output>;
}

function Fixture({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function MeasuredDashboard({ observer }: { observer: RenderObserver }) {
  useRenderMarker(observer, 'dashboard');
  return <section>Dashboard</section>;
}

function RenderEvidence({ observer }: { observer: RenderObserver }) {
  const snapshot = useRenderSnapshot(observer);
  return (
    <output>Dashboard renders: {snapshot.renders.dashboard ?? 0}</output>
  );
}

describe('React adapters', () => {
  it('marks committed renders without mutating during render', async () => {
    const observer = createRenderObserver();

    render(<Marked observer={observer} />);

    await waitFor(() => {
      expect(observer.getSnapshot().renders.probe).toBe(1);
    });
  });

  it('subscribes React consumers to stable snapshots', () => {
    const observer = createRenderObserver();

    function SnapshotProbe() {
      const snapshot = useRenderSnapshot(observer);
      return <output>{snapshot.renders.dashboard ?? 0}</output>;
    }

    render(<SnapshotProbe />);
    act(() => observer.markRender('dashboard'));

    expect(screen.getByText('1')).toBeVisible();
  });

  it('records React profiler commits', () => {
    const observer = createRenderObserver();

    render(
      <RenderProfiler observer={observer} id="fixture">
        <Fixture>profiled</Fixture>
      </RenderProfiler>,
    );

    expect(observer.getSnapshot().profiler.commitCount).toBeGreaterThan(0);
    expect(observer.getSnapshot().profiler.totalDurationMs).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('keeps the snapshot consumer outside the measured subtree', async () => {
    const observer = createRenderObserver();

    render(
      <>
        <RenderProfiler observer={observer} id="dashboard">
          <MeasuredDashboard observer={observer} />
        </RenderProfiler>
        <RenderEvidence observer={observer} />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard renders: 1')).toBeVisible();
    });
    const stableSnapshot = observer.getSnapshot();

    await act(async () => Promise.resolve());

    expect(observer.getSnapshot()).toBe(stableSnapshot);
    expect(stableSnapshot.renders.dashboard).toBe(1);
    expect(stableSnapshot.profiler.commitCount).toBeGreaterThan(0);
  });
});
