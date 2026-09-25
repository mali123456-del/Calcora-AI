interface AnalysisResult {
  headers: string[];
  rows: number[][];
  mean: number;
  slope: number;
  intercept: number;
  points: number;
  invalidCells: number;
}

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] as number[][], invalidCells: 0 };
  const raw = lines.map(line => line.split(',').map(cell => cell.trim()));
  const hasHeader = raw[0].some(cell => cell !== '' && !Number.isFinite(Number(cell)));
  const headers = hasHeader ? raw[0] : ['x', 'y'];
  const data = (hasHeader ? raw.slice(1) : raw).map(row => row.map(Number));
  const invalidCells = data.flat().filter(value => !Number.isFinite(value)).length;
  return { headers, rows: data, invalidCells };
}

self.onmessage = (event: MessageEvent<string>) => {
  const { headers, rows, invalidCells } = parseCSV(event.data);
  const numeric = rows.flat().filter(Number.isFinite);
  const mean = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
  const x = rows.map(row => row[0]).filter(Number.isFinite);
  const y = rows.map(row => row[1]).filter(Number.isFinite);
  const points = Math.min(x.length, y.length);
  const xbar = x.length ? x.reduce((sum, value) => sum + value, 0) / x.length : 0;
  const ybar = y.length ? y.reduce((sum, value) => sum + value, 0) / y.length : 0;
  const denom = x.reduce((sum, value) => sum + (value - xbar) ** 2, 0);
  const slope = denom && points ? x.slice(0, points).reduce((sum, value, index) => sum + (value - xbar) * (y[index] - ybar), 0) / denom : 0;
  const intercept = ybar - slope * xbar;
  const result: AnalysisResult = { headers, rows, mean, slope, intercept, points, invalidCells };
  self.postMessage(result);
};
