import { analyzeDatasetText } from '../services/dataAnalysis';

self.onmessage = (event: MessageEvent<{ id: number; text: string; delimiter: string }>) => {
  const { id, text, delimiter } = event.data;
  try {
    self.postMessage({ id, result: analyzeDatasetText(text, delimiter) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Dataset analysis failed.' });
  }
};
