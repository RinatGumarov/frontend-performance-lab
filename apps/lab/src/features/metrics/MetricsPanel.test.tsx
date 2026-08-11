import { createRenderObserver } from '@riguran/render-observer';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricsPanel } from './MetricsPanel';

describe('MetricsPanel', () => {
  it('distinguishes an unsampled frame metric from a measured zero', () => {
    const observer = createRenderObserver();
    render(<MetricsPanel observer={observer} />);

    const frameSamples = screen.getByText('Frame samples').parentElement!;
    const frameGaps = screen.getByText('rAF gaps').parentElement!;
    const maximumGap = screen.getByText('Maximum gap').parentElement!;

    expect(within(frameSamples).getByText('Not sampled')).toBeVisible();
    expect(within(frameGaps).getByText('Not sampled')).toBeVisible();
    expect(within(maximumGap).getByText('Not sampled')).toBeVisible();

    act(() => {
      observer.setFrameSample({
        sampleCount: 120,
        gapCount: 0,
        maxGapMs: 16.8,
      });
    });

    expect(within(frameSamples).getByText('120')).toBeVisible();
    expect(within(frameGaps).getByText('0')).toBeVisible();
    expect(within(maximumGap).getByText('16.8 ms')).toBeVisible();
  });
});
