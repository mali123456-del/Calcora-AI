import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Mic, MicOff, PenLine, UploadCloud, Sparkles, Trash2, CheckCircle2, Image as ImageIcon, Table2 } from 'lucide-react';

type Mode = 'scan' | 'voice' | 'ink' | 'files';

interface Props { onSendToCalculator: (expr: string) => void; }

export const MultimodalMathStudio: React.FC<Props> = ({ onSendToCalculator }) => {
  const [mode, setMode] = useState<Mode>('scan');
  const [fileName, setFileName] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const [inkActive, setInkActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const startVoice = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceText('Voice recognition is not supported by this browser.'); return; }
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    const recognition = new Recognition();
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true;
    recognition.onresult = (event: any) => setVoiceText(Array.from(event.results).map((r: any) => r[0]?.transcript || '').join(''));
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition; setListening(true); recognition.start();
  };

  const prepareCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    let drawing = false;
    const pos = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX-r.left, y: e.clientY-r.top }; };
    const down = (e: PointerEvent) => { drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if(!drawing) return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
    const up = () => { drawing=false; };
    canvas.onpointerdown=down; canvas.onpointermove=move; canvas.onpointerup=up; canvas.onpointerleave=up;
    setInkActive(true);
  };

  const clearCanvas = () => { const c=canvasRef.current; const ctx=c?.getContext('2d'); if(c&&ctx) ctx.clearRect(0,0,c.width,c.height); };

  const tabs: [Mode, React.ElementType, string, string][] = [
    ['scan', Camera, 'Scan Problem', 'Image / camera input'],
    ['voice', Mic, 'Voice Math', 'Speak naturally'],
    ['ink', PenLine, 'Digital Ink', 'Write an equation'],
    ['files', FileText, 'PDF / Data', 'Worksheet or table'],
  ];

  return <div className="space-y-5 animate-in fade-in duration-300">
    <section className="rounded-[28px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-white shadow-2xl">
      <div className="p-6 sm:p-8 bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,.22),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,.18),transparent_32%)]">
        <div className="flex flex-wrap items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider"><Sparkles className="inline w-3 h-3 mr-1"/> Multimodal Math Studio</span><span className="text-[10px] text-slate-500">Input → Understand → Solve → Verify</span></div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Give Calcora math in any form.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Scan a worksheet, speak a word problem, write with your mouse or upload a PDF/table. The interface keeps the original source visible while Calcora prepares a structured math request.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/10">
        {tabs.map(([id,Icon,title,desc]) => <button key={id} onClick={()=>setMode(id)} className={`p-4 text-left border-r border-white/10 last:border-r-0 transition ${mode===id?'bg-cyan-400/10':'hover:bg-white/5'}`}><Icon className={`w-5 h-5 ${mode===id?'text-cyan-300':'text-slate-400'}`} /><div className="mt-2 text-xs font-black">{title}</div><div className="mt-1 text-[9px] text-slate-500">{desc}</div></button>)}
      </div>
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        {mode==='scan' && <div><div className="flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-500"/><h2 className="text-sm font-black">Camera / Image Scanner</h2></div><label className="mt-4 min-h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-400/60 transition flex flex-col items-center justify-center cursor-pointer text-center p-6"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setFileName(e.target.files?.[0]?.name||'')} /><UploadCloud className="w-9 h-9 text-cyan-500"/><div className="mt-3 text-sm font-black">Drop an equation or take a photo</div><div className="mt-1 text-[10px] text-slate-500">Printed or handwritten math • JPG / PNG / WEBP</div>{fileName&&<div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs"><CheckCircle2 className="w-4 h-4"/>{fileName}</div>}</label></div>}
        {mode==='voice' && <div><div className="flex items-center gap-2"><Mic className="w-4 h-4 text-violet-500"/><h2 className="text-sm font-black">Voice Math</h2></div><button onClick={startVoice} className={`mt-6 mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${listening?'border-red-400 bg-red-500/10':'border-violet-400/30 bg-violet-500/10'} transition`}><>{listening?<MicOff className="w-7 h-7 text-red-400"/>:<Mic className="w-7 h-7 text-violet-400"/>}</><span className="mt-2 text-[10px] font-black">{listening?'Listening':'Start voice'}</span></button><textarea value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder="Or type the spoken problem here…" className="mt-6 w-full min-h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none focus:border-violet-400" /></div>}
        {mode==='ink' && <div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><PenLine className="w-4 h-4 text-cyan-500"/><h2 className="text-sm font-black">Digital Ink Board</h2></div><button onClick={clearCanvas} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"><Trash2 className="inline w-3 h-3 mr-1"/>Clear</button></div><canvas ref={canvasRef} width={900} height={430} onPointerDown={()=>!inkActive&&prepareCanvas()} className="mt-4 w-full h-[320px] rounded-2xl border border-slate-300 dark:border-slate-700 bg-white cursor-crosshair touch-none"/><div className="mt-2 text-[10px] text-slate-500">Write naturally. OCR/vision integration can consume this canvas in the AI layer.</div></div>}
        {mode==='files' && <div><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500"/><h2 className="text-sm font-black">Worksheet / Data Intake</h2></div><label className="mt-4 min-h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400/60 transition flex flex-col items-center justify-center cursor-pointer"><input type="file" accept=".pdf,.csv,.tsv,.xlsx,.xls,.txt,.md" multiple className="hidden" onChange={e=>setFileName(e.target.files?.[0]?.name||'')} /><div className="grid grid-cols-3 gap-2 mb-4"><span className="p-3 rounded-xl bg-red-500/10 text-red-500"><FileText/></span><span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><Table2/></span><span className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><ImageIcon/></span></div><div className="text-sm font-black">Upload homework, PDF or data</div><div className="mt-1 text-[10px] text-slate-500">Multiple files supported by the intake UI</div>{fileName&&<div className="mt-4 text-xs text-emerald-500">Selected: {fileName}</div>}</label></div>}
      </div>
      <aside className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-5">
        <div className="text-sm font-black">Processing Pipeline</div><div className="mt-4 space-y-2">{['Capture original input','Normalize to mathematical structure','Apply deterministic solver','Verify domain + answer','Ground explanation with knowledge','Generate tutor response'].map((x,i)=><div key={x} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800"><span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 grid place-items-center text-[10px] font-black">{i+1}</span><span className="text-[10px] font-bold">{x}</span></div>)}</div>
        <button onClick={()=>voiceText&&onSendToCalculator(voiceText)} className="mt-4 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black hover:bg-cyan-400 transition">Send structured request to Calcora</button>
        <div className="mt-3 text-[9px] leading-4 text-slate-500">Note: this UI does not pretend to perform OCR itself. Actual vision/OCR should be wired to the chosen model/provider and then passed through Calcora verification.</div>
      </aside>
    </section>
  </div>;
};
