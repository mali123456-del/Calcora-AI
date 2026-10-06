import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Mic, MicOff, PenLine, UploadCloud, Sparkles, Trash2, CheckCircle2, Image as ImageIcon, Table2, AlertTriangle, Loader2, ScrollText, X } from 'lucide-react';
import { extractPdfText, MAX_PDF_BYTES, MAX_PDF_PAGES, type PdfExtractionResult } from '../services/pdfExtraction';
import { createDocumentContext, type DocumentContext } from '../services/documentContext';
import { getBrowserPdfDocument } from '../services/pdfBrowser';
import { setActiveDocument, clearActiveDocument } from '../services/activeDocument';
import { resolveSpeechRecognitionLocale } from '../services/speechInput';
import { prepareVoiceMathInput, type VoiceMathInput } from '../services/voiceMathPipeline';
import {
  recognizeImage,
  recognizeInk,
  type RecognitionResult,
} from '../services/recognition';


type Mode = 'scan' | 'voice' | 'ink' | 'files';

interface Props {
  onAskTutorWithPrompt: (prompt: string) => void;
  onAskTutorAboutDocument: () => void;
}

/** Loads pdf.js only in the browser; the component must not crash under SSR/tests. */
function usePdfExtraction() {
  const [result, setResult] = useState<PdfExtractionResult | null>(null);
  const [document_, setDocument] = useState<DocumentContext | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'reading' | 'parsing' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  // Guards against a slow parse from a previous file overwriting a newer selection.
  const requestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    requestIdRef.current += 1;
    setResult(null);
    setDocument(null);
    setProgress(0);
    setError('');
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const requestId = ++requestIdRef.current;
    // Selecting any replacement file invalidates the previous tutor context immediately.
    clearActiveDocument();

    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus('error');
      setError('Only PDF files can be read here. Text, CSV and spreadsheet parsing is not implemented yet.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setStatus('error');
      setError(`This PDF is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_PDF_BYTES / (1024 * 1024)} MB.`);
      return;
    }

    setStatus('reading');
    setError('');
    setResult(null);
    setDocument(null);
    setProgress(0);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (requestId !== requestIdRef.current) return; // superseded by a newer file

      setStatus('parsing');
      const extraction = await extractPdfText(bytes, {
        getDocument: getBrowserPdfDocument,
        maxPages: MAX_PDF_PAGES,
        onProgress: (percent) => {
          if (requestId === requestIdRef.current) setProgress(percent);
        },
      });
      if (requestId !== requestIdRef.current) return;

      if (!extraction.success) {
        setStatus('error');
        setError(extraction.error ?? 'This PDF could not be read.');
        return;
      }

      setResult(extraction);
      setDocument(createDocumentContext({ fileName: file.name, pages: extraction.pages, needsOcr: extraction.needsOcr }));
      setStatus('done');
      setProgress(100);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setStatus('error');
      setError(err instanceof Error ? err.message : 'This PDF could not be read.');
    }
  };

  return { result, document: document_, progress, status, error, handleFile, reset, fileInputRef };
}


/**
 * Renders the outcome of a recognition attempt.
 *
 * The three states are deliberately visually distinct: an unavailable provider is an
 * honest capability limit, an error is a failure, and a verified result is the only case
 * that offers a result at all. A transcript the engine could not verify is shown as
 * text to check, never as a solved problem.
 */
function RecognitionOutcome({ result, onUse }: { result: RecognitionResult; onUse: () => void }): React.ReactElement {
  if (result.status === 'unavailable') {
    return (
      <div role="status" className="mt-3 rounded-xl border border-amber-300/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{result.message}</span>
        </div>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div role="alert" className="mt-3 rounded-xl border border-rose-300/40 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{result.message}</span>
        </div>
      </div>
    );
  }

  const verified = result.deterministic.verified;
  return (
    <div className={`mt-3 rounded-xl border p-3 text-xs ${verified ? 'border-emerald-300/40 bg-emerald-500/5' : 'border-amber-300/40 bg-amber-500/5'}`} role="status">
      <div className="flex items-start gap-2">
        {verified
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <div className="font-black text-slate-700 dark:text-slate-200">Recognized expression</div>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-slate-600 dark:text-slate-300">{result.text}</pre>
          <div className={`mt-2 ${verified ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-200'}`}>
            {result.message}
          </div>
          {result.deterministic.steps.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {result.deterministic.steps.map((step, index) => <li key={index}>• {step}</li>)}
            </ul>
          )}
          <button
            type="button"
            onClick={onUse}
            className="mt-3 w-full py-2 rounded-lg bg-cyan-500 text-slate-950 text-[11px] font-black hover:bg-cyan-400"
          >
            Ask the Tutor about this
          </button>
        </div>
      </div>
    </div>
  );
}

export const MultimodalMathStudio: React.FC<Props> = ({ onAskTutorWithPrompt, onAskTutorAboutDocument }) => {
  const [mode, setMode] = useState<Mode>('scan');
  const [fileName, setFileName] = useState('');
  const [scanState, setScanState] = useState<{ busy: boolean; result: RecognitionResult | null }>({ busy: false, result: null });
  const [voiceText, setVoiceText] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState<'auto' | 'en' | 'ur'>('auto');
  const [voiceError, setVoiceError] = useState('');
  const [voiceVerdict, setVoiceVerdict] = useState<VoiceMathInput | null>(null);
  const [listening, setListening] = useState(false);
  const [inkActive, setInkActive] = useState(false);
  const [inkState, setInkState] = useState<{ busy: boolean; result: RecognitionResult | null }>({ busy: false, result: null });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const pdf = usePdfExtraction();
  // Selected page numbers; an empty selection means "all pages".
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  /** Runs the recognition pipeline for a chosen image and keeps the honest result. */
  const runImageRecognition = async (file: File | undefined) => {
    if (!file) return;
    setScanState({ busy: true, result: null });
    try {
      setScanState({ busy: false, result: await recognizeImage(file) });
    } catch (error) {
      setScanState({
        busy: false,
        result: {
          status: 'error',
          text: '',
          message: error instanceof Error ? error.message : 'The image could not be read.',
          deterministic: { attempted: false, success: false, verified: false, expression: null, result: null, steps: [] },
        },
      });
    }
  };

  /** Converts the ink canvas to a PNG and sends it through the same recognition path. */
  const runInkRecognition = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setInkState({ busy: true, result: null });
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        setInkState({
          busy: false,
          result: {
            status: 'error',
            text: '',
            message: 'The handwriting canvas could not be exported.',
            deterministic: { attempted: false, success: false, verified: false, expression: null, result: null, steps: [] },
          },
        });
        return;
      }
      const file = new File([blob], 'handwriting.png', { type: 'image/png' });
      setInkState({ busy: false, result: await recognizeInk(file) });
    } catch (error) {
      setInkState({
        busy: false,
        result: {
          status: 'error',
          text: '',
          message: error instanceof Error ? error.message : 'The handwriting could not be read.',
          deterministic: { attempted: false, success: false, verified: false, expression: null, result: null, steps: [] },
        },
      });
    }
  };

  const startVoice = () => {
    setVoiceError('');
    setVoiceVerdict(null);
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceError('Voice recognition is not supported by this browser. You can still type a math request below.'); return; }
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    try {
      const recognition = new Recognition();
      recognition.lang = resolveSpeechRecognitionLocale(voiceLanguage, navigator.language);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0]?.transcript || '').join('');
        setVoiceText(transcript);
        setVoiceVerdict(prepareVoiceMathInput(transcript, voiceLanguage, navigator.language));
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        setVoiceError(event.error === 'no-speech' ? 'No speech was detected. Please try again or type the request.' : `Voice recognition failed (${event.error || 'unknown error'}).`);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError('Voice recognition could not start. Check microphone permission or type the request instead.');
    }
  };

  /** Recomputes the verdict when the learner edits the transcript by hand. */
  const onVoiceTextEdited = (value: string) => {
    setVoiceText(value);
    setVoiceVerdict(prepareVoiceMathInput(value, voiceLanguage, navigator.language));
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
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Bring a math problem into Calcora.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Use browser-supported voice dictation or local PDF text extraction. Image and handwriting recognition are unavailable until a real provider is configured.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/10">
        {tabs.map(([id,Icon,title,desc]) => <button key={id} onClick={()=>setMode(id)} className={`p-4 text-left border-r border-white/10 last:border-r-0 transition ${mode===id?'bg-cyan-400/10':'hover:bg-white/5'}`}><Icon className={`w-5 h-5 ${mode===id?'text-cyan-300':'text-slate-400'}`} /><div className="mt-2 text-xs font-black">{title}</div><div className="mt-1 text-[9px] text-slate-500">{desc}</div></button>)}
      </div>
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        {mode==='scan' && <div><div className="flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-500"/><h2 className="text-sm font-black">Camera / Image Scanner</h2></div><label className="mt-4 min-h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-400/60 transition flex flex-col items-center justify-center cursor-pointer text-center p-6"><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{const f=e.target.files?.[0];setFileName(f?.name||'');void runImageRecognition(f);}} /><UploadCloud className="w-9 h-9 text-cyan-500"/><div className="mt-3 text-sm font-black">Select a math image</div><div className="mt-1 text-[10px] text-slate-500">JPG / PNG · stays on this device</div>{fileName&&<div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs"><ImageIcon className="w-4 h-4"/>{fileName}</div>}</label>
          {scanState.busy && <div role="status" aria-live="polite" className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 p-3 text-xs text-cyan-700 dark:text-cyan-300"><Loader2 className="w-4 h-4 animate-spin"/>Reading the image…</div>}
          {scanState.result && <RecognitionOutcome result={scanState.result} onUse={() => scanState.result?.text && onAskTutorWithPrompt(scanState.result.text)} />}
        </div>}

        {mode==='voice' && <div><div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2"><Mic className="w-4 h-4 text-violet-500"/><h2 className="text-sm font-black">Voice Math</h2></div><label className="ml-auto flex items-center gap-2 text-xs text-slate-500">Speech language<select aria-label="Speech recognition language" value={voiceLanguage} onChange={event=>setVoiceLanguage(event.target.value as 'auto'|'en'|'ur')} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs"><option value="auto">Browser language</option><option value="en">English</option><option value="ur">Urdu</option></select></label></div><button type="button" onClick={startVoice} aria-pressed={listening} className={`mt-6 mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${listening?'border-red-400 bg-red-500/10':'border-violet-400/30 bg-violet-500/10'} transition`}><>{listening?<MicOff className="w-7 h-7 text-red-400"/>:<Mic className="w-7 h-7 text-violet-400"/>}</><span className="mt-2 text-[10px] font-black">{listening?'Stop listening':'Start voice'}</span></button><textarea aria-label="Math voice transcript" value={voiceText} onChange={e=>onVoiceTextEdited(e.target.value)} placeholder="Transcript appears here; you can also type a math request…" className="mt-6 w-full min-h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-sm outline-none focus:border-violet-400" />{voiceError&&<p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">{voiceError}</p>}{voiceVerdict && voiceVerdict.message && <p role="status" className={`mt-2 rounded-xl border p-3 text-xs ${voiceVerdict.status === 'ready' ? 'border-emerald-300/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-amber-300/40 bg-amber-500/5 text-amber-700 dark:text-amber-200'}`}>{voiceVerdict.message}</p>}<button type="button" disabled={voiceVerdict?.status !== 'ready'} onClick={()=>voiceVerdict?.prompt && onAskTutorWithPrompt(voiceVerdict.prompt)} className="mt-3 w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-500 disabled:opacity-50">Send transcript to Tutor</button></div>}

        {mode==='ink' && <div><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><PenLine className="w-4 h-4 text-cyan-500"/><h2 className="text-sm font-black">Digital Ink Board</h2></div><div className="flex gap-2"><button type="button" onClick={()=>{clearCanvas();setInkState({busy:false,result:null});}} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"><Trash2 className="inline w-3 h-3 mr-1"/>Clear</button><button type="button" onClick={()=>void runInkRecognition()} disabled={!inkActive||inkState.busy} className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 font-black disabled:opacity-50"><Sparkles className="inline w-3 h-3 mr-1"/>Recognize</button></div></div><canvas aria-label="Math handwriting canvas" ref={canvasRef} width={900} height={430} onPointerDown={()=>!inkActive&&prepareCanvas()} className="mt-4 w-full h-[320px] rounded-2xl border border-slate-300 dark:border-slate-700 bg-white cursor-crosshair touch-none"/>{inkState.busy && <div role="status" aria-live="polite" className="mt-3 flex items-center gap-2 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 p-3 text-xs text-cyan-700 dark:text-cyan-300"><Loader2 className="w-4 h-4 animate-spin"/>Reading the handwriting…</div>}{inkState.result && <RecognitionOutcome result={inkState.result} onUse={() => inkState.result?.text && onAskTutorWithPrompt(inkState.result.text)} />}</div>}

        {mode==='files' && <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500"/><h2 className="text-sm font-black">PDF Document Reader</h2></div>
            {pdf.status!=='idle' && <button onClick={() => { pdf.reset(); clearActiveDocument(); setSelectedPages([]); }} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><X className="inline w-3 h-3 mr-1"/>Clear</button>}
          </div>

          <label className="mt-4 min-h-56 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-400/60 transition flex flex-col items-center justify-center cursor-pointer text-center p-6">
            <input
              ref={pdf.fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pdf.handleFile(e.target.files?.[0])}
            />
            <UploadCloud className="w-9 h-9 text-amber-500"/>
            <div className="mt-3 text-sm font-black">Select a PDF to read</div>
            <div className="mt-1 text-[10px] text-slate-500">
              Text is extracted on this device. Nothing is uploaded.
              <br/>Up to {MAX_PDF_PAGES} pages, {MAX_PDF_BYTES / (1024 * 1024)} MB.
            </div>
          </label>

          {(pdf.status==='reading' || pdf.status==='parsing') && (
            <div className="mt-4 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 p-4" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                <Loader2 className="w-4 h-4 animate-spin"/>
                {pdf.status==='reading' ? 'Reading file…' : `Extracting text — page ${Math.max(1, Math.round((pdf.progress/100)*Math.max(pdf.result?.pageCount ?? 1,1)))}`}
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-cyan-100 dark:bg-cyan-900 overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-200" style={{ width: `${Math.max(4, pdf.progress)}%` }}/>
              </div>
            </div>
          )}

          {pdf.status==='error' && (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 flex gap-3" role="alert">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"/>
              <div>
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Could not read this PDF</div>
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{pdf.error}</div>
              </div>
            </div>
          )}

          {pdf.status==='done' && pdf.result && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500"/>
                    {pdf.result.pageCount} page{pdf.result.pageCount===1?'':'s'} · {pdf.result.totalChars.toLocaleString()} characters
                  </div>
                </div>

                {pdf.result.needsOcr ? (
                  <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      {pdf.result.totalChars === 0
                        ? 'No selectable text was found. This looks like a scanned or image-only PDF. Calcora does not run OCR, so it cannot read this document.'
                        : 'Very little text was found. This document is probably scanned and would need OCR for a reliable answer.'}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Extracted text is shown below and is available to the Tutor. Select only the pages you want to use.
                  </p>
                )}

                {pdf.result.pages.length > 1 && !pdf.result.needsOcr && (
                  <div className="mt-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pages available to the Tutor</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pdf.result.pages.map((page) => {
                        const active = selectedPages.length === 0 || selectedPages.includes(page.pageNumber);
                        return (
                          <button
                            key={page.pageNumber}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              const all = pdf.result?.pages.map((p) => p.pageNumber) ?? [];
                              const current = selectedPages.length ? selectedPages : all;
                              setSelectedPages(
                                current.includes(page.pageNumber)
                                  ? current.filter((n) => n !== page.pageNumber)
                                  : [...current, page.pageNumber].sort((a, b) => a - b),
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition ${
                              active
                                ? 'bg-amber-500/15 border-amber-400/60 text-amber-600 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            p.{page.pageNumber}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400">
                      {selectedPages.length === 0
                        ? `All ${pdf.result.pages.length} pages are shared.`
                        : `${selectedPages.length} of ${pdf.result.pages.length} pages shared.`}
                    </div>
                  </div>
                )}

                {pdf.result.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pdf.result.warnings.map((w) => (
                      <li key={w} className="text-[10px] text-slate-500 dark:text-slate-400">• {w}</li>
                    ))}
                  </ul>
                )}
              </div>

              {!pdf.result.needsOcr && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-slate-500"/>
                    <span className="text-[11px] font-black">Extracted text</span>
                    <span className="ml-auto text-[10px] text-slate-400">Pages 1–{pdf.result.pageCount}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-4 space-y-3">
                    {pdf.result.pages.map((page) => (
                      <div key={page.pageNumber}>
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Page {page.pageNumber}</div>
                        <pre className="mt-1 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 font-mono">
                          {page.text || <span className="italic text-slate-400">No selectable text on this page.</span>}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pdf.document?.hasText && (
                <button
                  onClick={() => {
                    const result = pdf.result;
                    if (!result) return;
                    setActiveDocument({
                      fileName: pdf.document?.fileName ?? 'document.pdf',
                      selectedPages,
                      totalPages: result.pageCount,
                      totalChars: result.totalChars,
                      needsOcr: result.needsOcr,
                      pages: result.pages,
                    });
                    onAskTutorAboutDocument();
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition"
                >
                  Ask the Tutor about this document
                </button>
              )}
            </div>
          )}
        </div>}
      </div>
      <aside className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-5">
        <div className="text-sm font-black">Current input capabilities</div><div className="mt-4 space-y-2">{['PDF text extraction runs locally when selectable text exists','Voice transcripts are sanitized and checked before reaching the Tutor','Image and handwriting recognition run only when a provider is configured','Recognized math is re-solved by Calcora’s deterministic engine before it is shown'].map((x,i)=><div key={x} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800"><span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 grid place-items-center text-[10px] font-black">{i+1}</span><span className="text-[10px] font-bold">{x}</span></div>)}</div>
        <div className="mt-3 text-[9px] leading-4 text-slate-500">No OCR or vision provider ships with Calcora, so photo and handwriting recognition report an honest unavailable state rather than a guess. When a provider is registered its transcript is treated as a proposal: Calcora's deterministic engine re-solves it before any answer is shown. Voice transcripts that contain no math are reported instead of forwarded.</div>

      </aside>
    </section>
  </div>;
};
