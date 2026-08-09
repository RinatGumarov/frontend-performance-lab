import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeBenchmarkReport,
  renderBenchmarkMarkdown,
} from './write-benchmark-report.mjs';

function createSnapshot(mode, mountedRows, dashboardRenders) {
  return {
    context: { datasetSize: 10_000, mode },
    renders: { dashboard: dashboardRenders, tooltip: 30 },
    mountedItems: { trades: mountedRows },
    profiler: { commitCount: 30, totalDurationMs: 12.5 },
    frames: { sampleCount: 0, gapCount: 0, maxGapMs: 0 },
  };
}

function createReport() {
  return {
    browser: 'chromium',
    viewport: { width: 1_440, height: 900 },
    generatedAt: '2026-08-09T12:00:00.000Z',
    baseline: createSnapshot('baseline', 10_000, 30),
    optimized: createSnapshot('optimized', 32, 0),
    disclaimer: 'Local observation; not a universal guarantee.',
  };
}

test('normalizes a valid benchmark with stable key ordering', () => {
  const normalized = normalizeBenchmarkReport(createReport());

  assert.deepEqual(Object.keys(normalized), [
    'baseline',
    'browser',
    'disclaimer',
    'generatedAt',
    'optimized',
    'viewport',
  ]);
  assert.match(
    renderBenchmarkMarkdown(normalized, { platform: 'darwin', arch: 'arm64' }),
    /\| Baseline \| 10,000 \| 30 \| 10,000 \|/,
  );
});

test('rejects a violated optimized render invariant', () => {
  const report = createReport();
  report.optimized.renders.dashboard = 1;

  assert.throws(
    () => normalizeBenchmarkReport(report),
    /optimized dashboard render delta must be 0/i,
  );
});

test('rejects non-finite measurements', () => {
  const report = createReport();
  report.baseline.profiler.totalDurationMs = Number.NaN;

  assert.throws(
    () => normalizeBenchmarkReport(report),
    /must be a non-negative finite number/i,
  );
});

test('rejects evidence captured outside the benchmark viewport', () => {
  const report = createReport();
  report.viewport = { width: 1_280, height: 720 };

  assert.throws(
    () => normalizeBenchmarkReport(report),
    /viewport must be 1440 by 900/i,
  );
});
