import {
  parseDelimitedDataset,
  type DatasetCell,
  type ParsedDataset,
} from './delimitedData';

export interface AnalysisResult {
  headers: string[];
  rows: DatasetCell[][];
  mean: number;
  slope: number;
  intercept: number;
  points: number;
  invalidCells: number;
  warnings: string[];
}

function numericCell(value: DatasetCell | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function analyzeDataset(dataset: ParsedDataset): AnalysisResult {
  const allNumeric: number[] = [];
  let invalidCells = 0;
  for (const row of dataset.rows) {
    for (const cell of row) {
      const value = numericCell(cell);
      if (value !== null) allNumeric.push(value);
    }
    for (const cell of row.slice(0, 2)) {
      if (cell !== null && cell.trim() !== '' && numericCell(cell) === null) invalidCells += 1;
    }
  }

  const pairs = dataset.rows.flatMap((row) => {
    const x = numericCell(row[0]);
    const y = numericCell(row[1]);
    return x === null || y === null ? [] : [{ x, y }];
  });
  const count = allNumeric.length;
  const mean = count ? allNumeric.reduce((sum, value) => sum + value, 0) / count : 0;
  const points = pairs.length;
  const xbar = points ? pairs.reduce((sum, point) => sum + point.x, 0) / points : 0;
  const ybar = points ? pairs.reduce((sum, point) => sum + point.y, 0) / points : 0;
  const denominator = pairs.reduce((sum, point) => sum + (point.x - xbar) ** 2, 0);
  const slope = denominator
    ? pairs.reduce((sum, point) => sum + (point.x - xbar) * (point.y - ybar), 0) / denominator
    : 0;

  return {
    headers: dataset.headers,
    rows: dataset.rows,
    mean,
    slope,
    intercept: ybar - slope * xbar,
    points,
    invalidCells,
    warnings: dataset.warnings,
  };
}

export function analyzeDatasetText(text: string, explicitDelimiter?: string): AnalysisResult {
  const delimiter = explicitDelimiter ?? (text.includes('\t') && !text.includes(',') ? '\t' : ',');
  return analyzeDataset(parseDelimitedDataset(text, delimiter));
}
