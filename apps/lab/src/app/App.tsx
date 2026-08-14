import {
  createRenderObserver,
  type FrameScheduler,
  type RenderObserver,
} from '@riguran/render-observer';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { toBoundedEquitySeries } from '../domain/equity';
import { generateTrades } from '../domain/generate-trades';
import { DATASET_SIZES, type DatasetSize } from '../domain/trade';
import type { EquityChartFactory } from '../features/chart/EquityChart';
import { MetricsPanel } from '../features/metrics/MetricsPanel';
import styles from './App.module.css';
import { DashboardStage } from './DashboardStage';
import {
  DEFAULT_DATASET_SIZE,
  DEFAULT_MODE,
  normalizeDatasetSize,
  type LabMode,
} from './lab-state';
import { useInteractionSample } from './use-interaction-sample';

const DATASET_LABELS: Record<DatasetSize, string> = {
  1_000: '1K',
  10_000: '10K',
  100_000: '100K',
};

const MAX_CHART_POINTS = 2_000;

const SAMPLE_STATUS_COPY = {
  idle: 'Ready to sample 120 animation frames.',
  running: 'Sampling 120 animation frames…',
  complete: 'Animation frame sample complete.',
  error: 'Animation frame sample failed.',
} as const;

const PROJECT_LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/rinatgumarov/frontend-performance-lab',
  },
  {
    label: 'Storybook',
    href: 'https://rinatgumarov.github.io/frontend-performance-lab/storybook/',
  },
  {
    label: 'npm',
    href: 'https://www.npmjs.com/package/@riguran/render-observer',
  },
] as const;

export interface AppProps {
  observer?: RenderObserver;
  chartFactory?: EquityChartFactory;
  frameScheduler?: FrameScheduler;
}

export function App({ observer, chartFactory, frameScheduler }: AppProps) {
  const [localObserver] = useState(createRenderObserver);
  const activeObserver = observer ?? localObserver;
  const [mode, setMode] = useState<LabMode>(DEFAULT_MODE);
  const [requestedDatasetSize, setRequestedDatasetSize] =
    useState<DatasetSize>(DEFAULT_DATASET_SIZE);
  const deferredDatasetSize = useDeferredValue(requestedDatasetSize);
  const effectiveDatasetSize = normalizeDatasetSize(
    mode,
    deferredDatasetSize,
  );
  const trades = useMemo(
    () => generateTrades(effectiveDatasetSize, 42),
    [effectiveDatasetSize],
  );
  const equity = useMemo(
    () => toBoundedEquitySeries(trades, MAX_CHART_POINTS),
    [trades],
  );
  const sampleKey = `${mode}:${effectiveDatasetSize}`;
  const sample = useInteractionSample(
    activeObserver,
    sampleKey,
    frameScheduler,
  );

  useEffect(() => {
    activeObserver.setContext({
      mode,
      datasetSize: effectiveDatasetSize,
    });
  }, [activeObserver, effectiveDatasetSize, mode]);

  const handleModeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextMode = event.target.value as LabMode;
    setMode(nextMode);
    if (nextMode === 'baseline' && requestedDatasetSize === 100_000) {
      setRequestedDatasetSize(10_000);
    }
  };

  const handleDatasetChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setRequestedDatasetSize(Number(event.target.value) as DatasetSize);
  };

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <nav aria-label="Project links" className={styles.navigation}>
          <span className={styles.brand}>Frontend Performance Lab</span>
          <ul className={styles.navLinks}>
            {PROJECT_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  className={styles.navLink}
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className={styles.eyebrow}>Instrumented React case study</p>
          <h1 className={styles.title}>
            Rendering 100,000 trades without rerendering the dashboard
          </h1>
          <p className={styles.summary}>
            One dataset and one visual system. Switch between a transparent
            baseline and isolated, virtualized rendering while the observer
            reports structural evidence in real time.
          </p>
        </div>
      </header>

      <section aria-label="Lab controls" className={styles.controls}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Rendering strategy</legend>
          <div className={styles.choices}>
            {(['baseline', 'optimized'] as const).map((option) => (
              <label className={styles.choice} key={option}>
                <input
                  checked={mode === option}
                  name="mode"
                  onChange={handleModeChange}
                  type="radio"
                  value={option}
                />
                <span>
                  {option === 'baseline' ? 'Baseline' : 'Optimized'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Dataset size</legend>
          <div className={styles.choices}>
            {DATASET_SIZES.map((size) => (
              <label className={styles.choice} key={size}>
                <input
                  checked={requestedDatasetSize === size}
                  disabled={mode === 'baseline' && size === 100_000}
                  name="dataset-size"
                  onChange={handleDatasetChange}
                  type="radio"
                  value={size}
                />
                <span>{DATASET_LABELS[size]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className={styles.sampleButton}
          disabled={sample.status === 'running'}
          onClick={sample.run}
          type="button"
        >
          Run interaction sample
        </button>

        {mode === 'baseline' ? (
          <p className={styles.notice}>
            Baseline is capped at 10,000 rows to keep this tab responsive.
          </p>
        ) : null}
        <p aria-live="polite" className={styles.status} role="status">
          {SAMPLE_STATUS_COPY[sample.status]}
        </p>
      </section>

      <section className={styles.evidenceGrid}>
        <div>
          <DashboardStage
            chartFactory={chartFactory}
            equity={equity}
            mode={mode}
            observer={activeObserver}
            trades={trades}
          />
        </div>
        <MetricsPanel observer={activeObserver} />
      </section>
    </main>
  );
}
