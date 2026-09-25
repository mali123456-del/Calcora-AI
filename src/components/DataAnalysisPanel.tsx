import React,{useEffect,useMemo,useRef,useState} from 'react';
import {BarChart3,Calculator,Download,FileSpreadsheet,LineChart,Table2,ShieldCheck,TimerReset} from 'lucide-react';

const demo=`x,y
1,2
2,4
3,5
4,8
5,10`;

interface AnalysisResult { headers:string[]; rows:number[][]; mean:number; slope:number; intercept:number; points:number; invalidCells:number; }

function analyzeOnMainThread(text:string):AnalysisResult {
  const lines=text.trim().split(/\r?\n/).filter(Boolean);
  const raw=lines.map(line=>line.split(',').map(cell=>cell.trim()));
  const hasHeader=raw.length>0 && raw[0].some(cell=>cell!==''&&!Number.isFinite(Number(cell)));
  const headers=hasHeader?raw[0]:['x','y'];
  const rows=(hasHeader?raw.slice(1):raw).map(row=>row.map(Number));
  const invalidCells=rows.flat().filter(v=>!Number.isFinite(v)).length;
  const numeric=rows.flat().filter(Number.isFinite);
  const mean=numeric.length?numeric.reduce((a,b)=>a+b,0)/numeric.length:0;
  const x=rows.map(r=>r[0]).filter(Number.isFinite),y=rows.map(r=>r[1]).filter(Number.isFinite);
  const points=Math.min(x.length,y.length);
  const xbar=x.length?x.reduce((a,b)=>a+b,0)/x.length:0,ybar=y.length?y.reduce((a,b)=>a+b,0)/y.length:0;
  const denom=x.reduce((s,v)=>s+(v-xbar)**2,0);
  const slope=denom&&points?x.slice(0,points).reduce((s,v,i)=>s+(v-xbar)*(y[i]-ybar),0)/denom:0;
  return {headers,rows,mean,slope,intercept:ybar-slope*xbar,points,invalidCells};
}

export const DataAnalysisPanel:React.FC=()=>{
 const [text,setText]=useState(demo);
 const [analysis,setAnalysis]=useState<AnalysisResult>(()=>analyzeOnMainThread(demo));
 const [workerActive,setWorkerActive]=useState(true);
 const workerRef=useRef<Worker|null>(null);
 useEffect(()=>{
   if(typeof Worker==='undefined'){setWorkerActive(false);return;}
   const worker=new Worker(new URL('../workers/dataAnalysis.worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=(event:MessageEvent<AnalysisResult>)=>setAnalysis(event.data);
   worker.onerror=()=>{setWorkerActive(false);worker.terminate();workerRef.current=null;};
   workerRef.current=worker;
   return()=>{worker.terminate();workerRef.current=null;};
 },[]);
 useEffect(()=>{
   if(workerRef.current){workerRef.current.postMessage(text);} else {setAnalysis(analyzeOnMainThread(text));}
 },[text]);
 const {headers,rows,mean,slope,intercept,points,invalidCells}=analysis;
 const exportJSON=()=>{const blob=new Blob([JSON.stringify({headers,rows,summary:{mean,slope,intercept,points,invalidCells}},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='calcora-analysis.json';a.click();URL.revokeObjectURL(a.href)};
 const status=useMemo(()=>invalidCells?'Validation warnings detected':'Dataset validated', [invalidCells]);
 return <div className="space-y-5 animate-in fade-in duration-300">
  <section className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_15%_0%,rgba(6,182,212,.18),transparent_35%),linear-gradient(135deg,#020617,#111827)] p-6 text-white">
   <div className="flex flex-wrap items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-cyan-300"/></div><div><h1 className="text-xl font-black">Data & Statistics Lab</h1><p className="text-xs text-slate-400">CSV → validate → summarize → regress without blocking the UI.</p></div><button onClick={exportJSON} className="ml-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10"><Download className="inline w-3.5 h-3.5 mr-1"/>Export</button></div>
   <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold"><span className="px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-300/20"><ShieldCheck className="inline w-3 h-3 mr-1"/>{status}</span><span className="px-2 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-300/20"><TimerReset className="inline w-3 h-3 mr-1"/>{workerActive?'Worker compute':'Main-thread fallback'}</span></div>
  </section>
  <div className="grid lg:grid-cols-2 gap-4">
   <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><div className="flex items-center gap-2 mb-3"><FileSpreadsheet className="w-4 h-4 text-cyan-500"/><b className="text-sm">Dataset</b></div><textarea value={text} onChange={e=>setText(e.target.value)} className="w-full h-64 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 font-mono text-xs outline-none focus:border-cyan-400"/><p className="mt-2 text-[10px] text-slate-500">Paste comma-separated numeric data. The first row may contain column names. Heavy parsing runs in a Web Worker when supported.</p></section>
   <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><div className="flex items-center gap-2 mb-3"><Table2 className="w-4 h-4 text-violet-500"/><b className="text-sm">Computed summary</b></div><div className="grid grid-cols-2 gap-2">{[['Rows',rows.length],['Columns',headers.length],['Mean',mean.toFixed(6)],['Regression slope',slope.toFixed(6)],['Intercept',intercept.toFixed(6)],['Correlation-ready points',points],['Invalid cells',invalidCells]].map(([k,v])=><div key={k as string} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">{k as string}</div><div className="mt-1 text-sm font-black">{v as any}</div></div>)}</div><div className="mt-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3"><div className="flex items-center gap-2 text-xs font-bold"><LineChart className="w-4 h-4 text-cyan-500"/> Linear model</div><div className="mt-2 font-mono text-sm">y ≈ {slope.toFixed(4)}x + {intercept.toFixed(4)}</div></div></section>
  </div>
  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-500"/><b className="text-sm">Workflow</b></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">{['Import','Validate numeric columns','Descriptive statistics','Regression','Graph','Ask Tutor','Verify'].map((x,i)=><span key={x} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800"><span className="text-cyan-500 mr-1">{i+1}</span>{x}</span>)}</div></section>
 </div>;
};