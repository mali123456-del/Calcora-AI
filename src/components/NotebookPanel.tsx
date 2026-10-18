/**
 * Notebook workspace panel.
 *
 * Persistent workspace for a learner's own work. Every stored entry is verified by the
 * deterministic engine on creation, and the verification status is displayed verbatim —
 * an unverified entry is explicitly labelled as such rather than being presented as a
 * result. Notebook state is local and independent of calculator state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, Save, ShieldCheck, ShieldAlert, ShieldQuestion, Copy, Check } from 'lucide-react';
import {
  addNotebookEntry,
  removeNotebookEntry,
  createNotebook,
  loadNotebook,
  saveNotebook,
  clearNotebooks,
  summarizeNotebook,
  type Notebook,
  type NotebookEntryType,
  type NotebookEntry,
} from '../services/notebook';

const ENTRY_TYPES: NotebookEntryType[] = [
  'problem', 'calculation', 'step', 'explanation', 'tutor', 'note', 'reference', 'practice',
];

const STATUS_STYLE: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
  PASS: { icon: ShieldCheck, className: 'text-emerald-600 dark:text-emerald-400', label: 'Verified' },
  FAIL: { icon: ShieldAlert, className: 'text-rose-600 dark:text-rose-400', label: 'Verification failed' },
  UNKNOWN: { icon: ShieldQuestion, className: 'text-slate-500 dark:text-slate-400', label: 'Not verified' },
};

export const NotebookPanel: React.FC<{ onSendToCalculator?: (expression: string) => void }> = ({ onSendToCalculator }) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState<NotebookEntryType>('calculation');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loaded = loadNotebook();
    setNotebooks(loaded);
    if (loaded.length) setActiveId((current) => current ?? loaded[0].id);
  }, []);

  const active = useMemo(
    () => notebooks.find((nb) => nb.id === activeId) ?? null,
    [notebooks, activeId],
  );
  const summary = useMemo(() => (active ? summarizeNotebook(active) : null), [active]);

  const persist = useCallback((next: Notebook[]) => {
    setNotebooks(next);
    next.forEach((nb) => saveNotebook(nb));
  }, []);

  const handleCreate = () => {
    const notebook = createNotebook(title || 'Untitled notebook');
    setTitle('');
    persist([notebook, ...notebooks]);
    setActiveId(notebook.id);
  };

  const handleAddEntry = () => {
    if (!active || !text.trim()) {
      setNotice('Enter some content before adding an entry.');
      return;
    }
    const next = addNotebookEntry(active, { type: entryType, title: entryType, text });
    if (next.entries.length === active.entries.length) {
      setNotice('That entry was rejected. Check the content type and length.');
      return;
    }
    setNotice('');
    setText('');
    persist(notebooks.map((nb) => (nb.id === active.id ? next : nb)));
  };

  const handleRemove = (entryId: string) => {
    if (!active) return;
    const next = removeNotebookEntry(active, entryId);
    persist(notebooks.map((nb) => (nb.id === active.id ? next : nb)));
  };

  const handleDeleteNotebook = (id: string) => {
    persist(notebooks.filter((nb) => nb.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleCopy = async (entry: NotebookEntry) => {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice('Clipboard access was refused by the browser.');
    }
  };

  const handleReset = () => {
    clearNotebooks();
    setNotebooks([]);
    setActiveId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5" data-testid="notebook-panel">
      <header className="flex flex-wrap items-center gap-3">
        <BookOpen className="w-5 h-5 text-cyan-500" aria-hidden="true" />
        <h1 className="text-xl font-black">Notebook</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto">
          Persistent workspace for your problems, calculations and Tutor work. Entries are
          checked by Calcora&rsquo;s deterministic engine and their verification status is shown as recorded.
        </p>
      </header>

      <section className="flex flex-wrap gap-2 items-end" aria-label="Create notebook">
        <div className="flex-1 min-w-48">
          <label htmlFor="notebook-title" className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            New notebook title
          </label>
          <input
            id="notebook-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Quadratics revision"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white hover:bg-cyan-800"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />Create notebook
        </button>
      </section>

      {notebooks.length === 0 ? (
        <div
          role="status"
          className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 text-center"
        >
          <BookOpen className="w-8 h-8 mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-black">No notebooks yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Create a notebook to keep your problems, calculations and Tutor work together.
          </p>
        </div>
      ) : (
        <>
          <nav aria-label="Notebooks" className="flex flex-wrap gap-2">
            {notebooks.map((nb) => (
              <button
                key={nb.id}
                type="button"
                onClick={() => setActiveId(nb.id)}
                aria-current={nb.id === activeId ? 'true' : undefined}
                className={`rounded-xl px-3 py-2 text-xs font-bold border ${
                  nb.id === activeId
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {nb.title} <span className="opacity-60">({nb.entries.length})</span>
              </button>
            ))}
          </nav>

          {active && (
            <>
              <section
                className="flex flex-wrap gap-3 items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                aria-label="Notebook summary"
              >
                <dl className="flex flex-wrap gap-4 text-xs">
                  <div><dt className="text-slate-500">Entries</dt><dd className="font-black">{summary?.entryCount ?? 0}</dd></div>
                  <div><dt className="text-slate-500">Verified</dt><dd className="font-black text-emerald-600 dark:text-emerald-400">{summary?.verifiedCount ?? 0}</dd></div>
                  <div><dt className="text-slate-500">Failed</dt><dd className="font-black text-rose-600 dark:text-rose-400">{summary?.failedCount ?? 0}</dd></div>
                  <div><dt className="text-slate-500">Not verified</dt><dd className="font-black text-slate-500">{summary?.unknownCount ?? 0}</dd></div>
                </dl>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteNotebook(active.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/60 px-3 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />Delete notebook
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3" aria-label="Add entry">
                <div className="flex flex-wrap gap-2">
                  <div>
                    <label htmlFor="notebook-entry-type" className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Type</label>
                    <select
                      id="notebook-entry-type"
                      value={entryType}
                      onChange={(event) => setEntryType(event.target.value as NotebookEntryType)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                    >
                      {ENTRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-56">
                    <label htmlFor="notebook-entry-text" className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Content</label>
                    <textarea
                      id="notebook-entry-text"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={3}
                      placeholder="e.g. 2x + 4 = 10, or your own working"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono-math outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                {notice && <p role="alert" className="text-xs text-amber-600 dark:text-amber-300">{notice}</p>}
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white hover:bg-cyan-800"
                >
                  <Save className="w-4 h-4" aria-hidden="true" />Add to notebook
                </button>
              </section>

              <section aria-label="Notebook entries" className="space-y-2">
                {active.entries.length === 0 ? (
                  <p role="status" className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-xs text-slate-500">
                    This notebook is empty. Add a calculation or note to begin.
                  </p>
                ) : active.entries.map((entry) => {
                  const status = STATUS_STYLE[entry.verification?.status ?? 'UNKNOWN'] ?? STATUS_STYLE.UNKNOWN;
                  const StatusIcon = status.icon;
                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-slate-400">{entry.type}</span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-black ${status.className}`}>
                              <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {entry.verification?.status === 'PASS' ? 'Verified' : entry.verification?.status === 'FAIL' ? 'Verification failed' : 'Not verified'}
                            </span>
                          </div>
                          {entry.text && (
                            <pre className="mt-2 whitespace-pre-wrap break-words font-mono-math text-sm text-slate-800 dark:text-slate-100">{entry.text}</pre>
                          )}
                          {entry.verification?.reason && (
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{entry.verification.reason}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {onSendToCalculator && entry.text && (
                            <button
                              type="button"
                              onClick={() => onSendToCalculator(entry.text)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-bold"
                            >
                              To calculator
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(entry)}
                            aria-label={`Copy ${entry.type} entry`}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(entry.id)}
                            aria-label={`Delete ${entry.type} entry`}
                            className="rounded-lg border border-rose-300/60 px-2 py-1 text-rose-600 dark:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Reset all notebooks on this device
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};
