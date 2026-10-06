import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Calculator, Download, FileSpreadsheet, LineChart, Table2, ShieldCheck, TimerReset, UploadCloud } from 'lucide-react';
import {
  analyzeDataset,
  analyzeDatasetText,
  type AnalysisResult,
} from '../services/dataAnalysis';
import {
  MAX_DATASET_BYTES,
  parseDatasetFileName,
  parseDelimitedDataset,
  parseXlsxDataset,
  serializeDataset,
  type ParsedDataset,
} from '../services/dataImport';

const demo = `x,y
1,2
2,4
3,5
4,8
5,10`;

interface WorkerResponse {
  id: number;
  result?: AnalysisResult;
  error?: string;
}

export const DataAnalysisPanel: React.FC = () => {
  const [text, setText] = useState(demo);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => analyzeDatasetText(demo));
  const [workerActive, setWorkerActive] = useState(true);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setWorkerActive(false);
      return;
    }
    const worker = new Worker(new URL('../workers/dataAnalysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== requestIdRef.current) return;
      if (event.data.result) {
        setAnalysis(event.data.result);
        setError('');
      } else {
        setError(event.data.error || 'Dataset analysis failed.');
      }
    };
    worker.onerror = () => {
      setWorkerActive(false);
      worker.terminate();
      workerRef.current = null;
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = ++requestIdRef.current;
    if (workerRef.current) {
      workerRef.current.postMessage({ id, text, delimiter });
      return;
    }
    try {
      setAnalysis(analyzeDatasetText(text, delimiter));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Dataset analysis failed.');
    }
  }, [text, delimiter]);

  const handleImport = async (file?: File) => {
    if (!file) return;
    const format = parseDatasetFileName(file.name);
    if (!format) {
      setError('Choose a .csv, .tsv or .xlsx file.');
      return;
    }
    if (file.size > MAX_DATASET_BYTES) {
      setError(`This file exceeds the ${MAX_DATASET_BYTES / (1024 * 1024)} MB import limit.`);
      return;
    }

    try {
      const imported: ParsedDataset = format === 'xlsx'
        ? parseXlsxDataset(new Uint8Array(await file.arrayBuffer()))
        : parseDelimitedDataset(await file.text(), format === 'tsv' ? '\t' : ',', MAX_DATASET_BYTES, format);
      const serialised = serializeDataset(imported, format === 'tsv' ? '\t' : ',');
      setFileName(file.name);
      setDelimiter(format === 'tsv' ? '\t' : ',');
      setAnalysis(analyzeDataset(imported));
      setError('');
      setText(serialised);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The selected dataset could not be read.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { headers, rows, mean, slope, intercept, points, invalidCells, warnings } = analysis;
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ headers, rows, summary: { mean, slope, intercept, points, invalidCells }, warnings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'calcora-analysis.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const status = useMemo(() => error ? 'Import or parse error' : invalidCells ? 'Validation warnings detected' : 'Dataset validated', [error, invalidCells]);

  return <div className="space-y-5 animate-in fade-in duration-300">
    <section className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_15%_0%,rgba(6,182,212,.18),transparent_35%),linear-gradient(135deg,#020617,#111827)] p-6 text-white">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-cyan-300" /></div>
        <div><h1 className="text-xl font-black">Data & Statistics Lab</h1><p className="text-xs text-slate-400">Import CSV, TSV or XLSX → validate → summarize → regress.</p></div>
        <button type="button" onClick={exportJSON} className="ml-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10"><Download className="inline w-3.5 h-3.5 mr-1" />Export JSON</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold">
        <span className={`px-2 py-1 rounded-full border ${error || invalidCells ? 'bg-amber-400/10 text-amber-300 border-amber-300/20' : 'bg-emerald-400/10 text-emerald-300 border-emerald-300/20'}`}><ShieldCheck className="inline w-3 h-3 mr-1" />{status}</span>
        <span className="px-2 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-300/20"><TimerReset className="inline w-3 h-3 mr-1" />{workerActive ? 'Worker compute' : 'Main-thread fallback'}</span>
        {fileName && <span className="px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">{fileName}</span>}
      </div>
    </section>
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3"><FileSpreadsheet className="w-4 h-4 text-cyan-500" /><b className="text-sm">Dataset</b>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 text-xs font-bold hover:bg-cyan-500/20"><UploadCloud className="w-3.5 h-3.5" />Import file</button>
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => void handleImport(event.target.files?.[0])} aria-label="Import CSV, TSV or XLSX dataset" />
        </div>
        <textarea aria-label="Dataset text" value={text} onChange={(event) => setText(event.target.value)} className="w-full h-64 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 font-mono text-xs outline-none focus:border-cyan-400" />
        <p className="mt-2 text-[10px] text-slate-500">Supports quoted CSV/TSV fields, missing values, headers and the first worksheet of XLSX. Maximum file size: {MAX_DATASET_BYTES / (1024 * 1024)} MB.</p>
        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300">{error}</p>}
        {warnings.map((warning) => <p key={warning} role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-300">{warning}</p>)}
      </section>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3"><Table2 className="w-4 h-4 text-violet-500" /><b className="text-sm">Computed summary</b></div>
        <div className="grid grid-cols-2 gap-2">{[['Rows', rows.length], ['Columns', headers.length], ['Mean (numeric cells)', mean.toFixed(6)], ['Regression slope', slope.toFixed(6)], ['Intercept', intercept.toFixed(6)], ['Paired numeric points', points], ['Invalid x/y cells', invalidCells]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>)}</div>
        <div className="mt-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3"><div className="flex items-center gap-2 text-xs font-bold"><LineChart className="w-4 h-4 text-cyan-500" />Linear model</div><div className="mt-2 font-mono text-sm">y ≈ {slope.toFixed(4)}x + {intercept.toFixed(4)}</div></div>
        <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-[10px]"><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className="px-2 py-1.5 font-bold">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-slate-100 dark:border-slate-800">{headers.map((_, columnIndex) => <td key={columnIndex} className="px-2 py-1.5">{row[columnIndex] ?? '—'}</td>)}</tr>)}</tbody></table>
          {rows.length > 100 && <p className="p-2 text-center text-[10px] text-slate-500">Showing first 100 rows; all rows remain included in analysis/export.</p>}
        </div>
      </section>
    </div>
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-500" /><b className="text-sm">Workflow</b></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">{['Import CSV/TSV/XLSX', 'Validate numeric pairs', 'Descriptive summary', 'Linear regression', 'Export results'].map((label, index) => <span key={label} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-cyan-500 mr-1">{index + 1}</span>{label}</span>)}</div></section>
  </div>;
};
