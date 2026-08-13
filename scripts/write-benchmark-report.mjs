import { readFile, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { pathToFileURL } from 'node:url';

const disclaimer = 'Local observation; not a universal guarantee.';
const integerFormatter = new Intl.NumberFormat('en-US');

function assertRecord(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value;
}

function assertString(value, path) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function assertNonNegativeFinite(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative finite number`);
  }
  return value;
}

function assertNonNegativeInteger(value, path) {
  const number = assertNonNegativeFinite(value, path);
  if (!Number.isInteger(number)) {
    throw new TypeError(`${path} must be a non-negative integer`);
  }
  return number;
}

function validateCounterRecord(value, path) {
  const record = assertRecord(value, path);
  for (const [key, count] of Object.entries(record)) {
    assertNonNegativeInteger(count, `${path}.${key}`);
  }
  return record;
}

function validateSnapshot(value, path, expectedMode) {
  const snapshot = assertRecord(value, path);
  const context = assertRecord(snapshot.context, `${path}.context`);
  if (context.mode !== expectedMode) {
    throw new TypeError(`${path}.context.mode must be ${expectedMode}`);
  }
  if (context.datasetSize !== 10_000) {
    throw new TypeError(`${path}.context.datasetSize must be 10000`);
  }

  validateCounterRecord(snapshot.renders, `${path}.renders`);
  validateCounterRecord(
    snapshot.mountedItems,
    `${path}.mountedItems`,
  );
  const profiler = assertRecord(snapshot.profiler, `${path}.profiler`);
  assertNonNegativeInteger(
    profiler.commitCount,
    `${path}.profiler.commitCount`,
  );
  assertNonNegativeFinite(
    profiler.totalDurationMs,
    `${path}.profiler.totalDurationMs`,
  );
  const frames = assertRecord(snapshot.frames, `${path}.frames`);
  assertNonNegativeInteger(frames.sampleCount, `${path}.frames.sampleCount`);
  assertNonNegativeInteger(frames.gapCount, `${path}.frames.gapCount`);
  assertNonNegativeFinite(frames.maxGapMs, `${path}.frames.maxGapMs`);

  return snapshot;
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  return value;
}

export function normalizeBenchmarkReport(value) {
  const report = assertRecord(value, 'report');
  assertString(report.browser, 'report.browser');
  const viewport = assertRecord(report.viewport, 'report.viewport');
  assertNonNegativeInteger(viewport.width, 'report.viewport.width');
  assertNonNegativeInteger(viewport.height, 'report.viewport.height');
  if (viewport.width !== 1_440 || viewport.height !== 900) {
    throw new RangeError('report viewport must be 1440 by 900');
  }
  const generatedAt = assertString(report.generatedAt, 'report.generatedAt');
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new TypeError('report.generatedAt must be an ISO-compatible date');
  }
  if (report.disclaimer !== disclaimer) {
    throw new TypeError(`report.disclaimer must be "${disclaimer}"`);
  }

  const baseline = validateSnapshot(report.baseline, 'report.baseline', 'baseline');
  const optimized = validateSnapshot(
    report.optimized,
    'report.optimized',
    'optimized',
  );
  if (optimized.mountedItems.trades > 80) {
    throw new RangeError('optimized mounted trade rows must not exceed 80');
  }
  if (optimized.renders.dashboard !== 0) {
    throw new RangeError('optimized dashboard render delta must be 0');
  }
  if (baseline.mountedItems.trades !== 10_000) {
    throw new RangeError('baseline mounted trade rows must equal 10000');
  }
  if (baseline.renders.dashboard < 20) {
    throw new RangeError('baseline dashboard render delta must be at least 20');
  }

  return sortKeys(report);
}

function formatDuration(value) {
  return `${value.toFixed(2)} ms`;
}

export function renderBenchmarkMarkdown(
  report,
  environment = { platform: platform(), arch: arch() },
) {
  const baseline = report.baseline;
  const optimized = report.optimized;
  const rows = [
    ['Baseline', baseline],
    ['Optimized', optimized],
  ].map(
    ([label, snapshot]) =>
      `| ${label} | ${integerFormatter.format(snapshot.context.datasetSize)} | ${integerFormatter.format(snapshot.renders.dashboard)} | ${integerFormatter.format(snapshot.mountedItems.trades)} | ${integerFormatter.format(snapshot.profiler.commitCount)} | ${formatDuration(snapshot.profiler.totalDurationMs)} |`,
  );

  return `# Local benchmark evidence

Generated at ${report.generatedAt} with ${report.browser} at ${report.viewport.width} × ${report.viewport.height} on ${environment.platform}/${environment.arch}.

| Mode | Dataset | Dashboard render delta | Mounted rows | Profiler commit delta | Observed commit duration |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows.join('\n')}

The benchmark moves the chart pointer through 30 distinct positions. It gates structural behavior only: the optimized dashboard must stay isolated, its virtual table must mount at most 80 rows, and the baseline must expose the contrasting rerenders with all 10,000 rows mounted. Durations are recorded for context and are not pass/fail thresholds.

> ${report.disclaimer}
`;
}

export async function writeBenchmarkReport({
  rawPath = 'artifacts/performance/raw.json',
  jsonPath = 'artifacts/performance/latest.json',
  markdownPath = 'artifacts/performance/latest.md',
} = {}) {
  const raw = JSON.parse(await readFile(rawPath, 'utf8'));
  const report = normalizeBenchmarkReport(raw);

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(markdownPath, renderBenchmarkMarkdown(report), 'utf8'),
  ]);

  return report;
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  try {
    await writeBenchmarkReport();
    console.log('Wrote normalized benchmark evidence to artifacts/performance.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
