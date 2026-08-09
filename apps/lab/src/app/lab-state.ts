import {
  BASELINE_MAX_ROWS,
  type DatasetSize,
} from '../domain/trade';

export type LabMode = 'baseline' | 'optimized';

export const DEFAULT_MODE: LabMode = 'optimized';
export const DEFAULT_DATASET_SIZE: DatasetSize = 100_000;

export function normalizeDatasetSize(
  mode: LabMode,
  datasetSize: DatasetSize,
): DatasetSize {
  if (mode === 'baseline' && datasetSize > BASELINE_MAX_ROWS) {
    return BASELINE_MAX_ROWS;
  }
  return datasetSize;
}
