import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Trash2,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  Check,
  Plus,
  BookMarked,
  StickyNote,
} from 'lucide-react';
import {
  WorkspaceSession,
  CalculationNote,
  HistoryItem,
} from '../types';
import {
  loadWorkspaces,
  saveWorkspaces,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  exportHistoryToCSV,
  exportHistoryToTXT,
  exportWorkspaceToJSON,
  validateAndImportWorkspace,
  DEFAULT_WORKSPACE,
} from '../engine/workspaceEngine';
import {
  exportCalcoraData,
  loadCalcoraDataSnapshot,
  saveCalcoraDataSnapshot,
  validateAndImportCalcoraData,
  deleteCalcoraData,
} from '../services/dataTransferService';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHistory: HistoryItem[];
  onLoadHistory: (items: HistoryItem[]) => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentHistory,
  onLoadHistory,
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSession[]>(loadWorkspaces);
  const [activeId, setActiveId] = useState<string>(getActiveWorkspaceId);
  const [newWsName, setNewWsName] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'notes' | 'export'>('workspaces');

  useEffect(() => {
    if (isOpen) {
      setWorkspaces(loadWorkspaces());
      setActiveId(getActiveWorkspaceId());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeWorkspace = workspaces.find((w) => w.id === activeId) || workspaces[0] || DEFAULT_WORKSPACE;

  // Switch Workspace
  const handleSelectWorkspace = (ws: WorkspaceSession) => {
    setActiveId(ws.id);
    setActiveWorkspaceId(ws.id);
    onLoadHistory(ws.historyItems);
  };

  // Create Workspace
  const handleCreateWorkspace = () => {
    if (!newWsName.trim()) return;
    const newWs: WorkspaceSession = {
      id: `ws-${Date.now()}`,
      name: newWsName.trim(),
      category: 'general',
      historyItems: [],
      notes: [],
      created: Date.now(),
      lastModified: Date.now(),
    };
    const next = [...workspaces, newWs];
    setWorkspaces(next);
    saveWorkspaces(next);
    setNewWsName('');
    handleSelectWorkspace(newWs);
  };

  // Delete Workspace
  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length <= 1) return;
    const next = workspaces.filter((w) => w.id !== id);
    setWorkspaces(next);
    saveWorkspaces(next);
    if (activeId === id) {
      handleSelectWorkspace(next[0]);
    }
  };

  // Add Note to current workspace
  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    const newNote: CalculationNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      timestamp: Date.now(),
    };

    const nextWorkspaces = workspaces.map((w) =>
      w.id === activeId ? { ...w, notes: [newNote, ...w.notes] } : w
    );
    setWorkspaces(nextWorkspaces);
    saveWorkspaces(nextWorkspaces);
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    const nextWorkspaces = workspaces.map((w) =>
      w.id === activeId ? { ...w, notes: w.notes.filter((n) => n.id !== noteId) } : w
    );
    setWorkspaces(nextWorkspaces);
    saveWorkspaces(nextWorkspaces);
  };

  // Download export files
  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle JSON Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = validateAndImportWorkspace(text);
        const next = [...workspaces, imported];
        setWorkspaces(next);
        saveWorkspaces(next);
        handleSelectWorkspace(imported);
      } catch (err: any) {
        setImportError(err.message || 'Import failed. Check JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workspaces and Notes"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Workspaces & Notes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-2">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'workspaces'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sessions ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Calculation Notes ({activeWorkspace.notes.length})
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Import / Export
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              {/* New Workspace */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="New workspace name (e.g. Physics HW 3)..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleCreateWorkspace}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create</span>
                </button>
              </div>

              {/* Workspace List */}
              <div className="space-y-2">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeId;
                  return (
                    <div
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">
                            {ws.name}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {ws.historyItems.length} calculations • {ws.notes.length} notes
                        </div>
                      </div>

                      {workspaces.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <textarea
                  rows={2}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Annotate your derivations or formulas..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Note
                </button>
              </div>

              {/* Note List */}
              <div className="space-y-2.5">
                {activeWorkspace.notes.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    No notes attached to this workspace yet.
                  </p>
                ) : (
                  activeWorkspace.notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 relative"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {n.title}
                        </h4>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {n.content}
                      </p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        {new Date(n.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Export Calculation History
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      downloadFile(
                        exportHistoryToCSV(currentHistory),
                        `calc-history-${Date.now()}.csv`,
                        'text/csv'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 text-left transition-all flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Export as CSV
                      </div>
                      <div className="text-[10px] text-slate-400">Excel / Spreadsheet</div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      downloadFile(
                        exportHistoryToTXT(currentHistory),
                        `calc-history-${Date.now()}.txt`,
                        'text/plain'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 text-left transition-all flex items-center gap-2.5"
                  >
                    <FileText className="w-5 h-5 text-sky-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Export as Plain Text
                      </div>
                      <div className="text-[10px] text-slate-400">Human-readable logs</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Calcora Data Controls
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Local-only data export/import. API keys, bearer tokens and credentials are never exported.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => downloadFile(exportCalcoraData(loadCalcoraDataSnapshot()), `calcora-data-${Date.now()}.json`, 'application/json')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 text-left"
                  >
                    <Download className="w-4 h-4 text-indigo-500 mb-1" />
                    <div className="text-xs font-semibold">Export Calcora Data</div>
                    <div className="text-[10px] text-slate-400">History, workspaces & learning state</div>
                  </button>
                  <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-900 text-left cursor-pointer">
                    <Upload className="w-4 h-4 text-amber-500 mb-1" />
                    <div className="text-xs font-semibold">Import Calcora Data</div>
                    <div className="text-[10px] text-slate-400">Validated JSON only</div>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const snapshot = validateAndImportCalcoraData(String(reader.result ?? ''));
                            saveCalcoraDataSnapshot(snapshot);
                            onLoadHistory(snapshot.calculationHistory);
                            setImportError(null);
                          } catch (err) {
                            setImportError(err instanceof Error ? err.message : 'Calcora data import failed');
                          } finally {
                            e.currentTarget.value = '';
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (!window.confirm('Delete calculation history? This cannot be undone.')) return;
                      deleteCalcoraData('history');
                      onLoadHistory([]);
                    }}
                    className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:border-rose-500 text-left"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 mb-1" />
                    <div className="text-xs font-semibold">Delete History</div>
                    <div className="text-[10px] text-slate-400">Remove saved calculations</div>
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm('Reset all local Calcora data? Installation files and unrelated Windows data will not be touched.')) return;
                      deleteCalcoraData('all');
                      onLoadHistory([]);
                      window.location.reload();
                    }}
                    className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 hover:border-rose-600 text-left"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600 mb-1" />
                    <div className="text-xs font-semibold">Reset Local Calcora Data</div>
                    <div className="text-[10px] text-slate-400">Explicit confirmation required</div>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Full Workspace Backup & Restore
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      downloadFile(
                        exportWorkspaceToJSON(activeWorkspace),
                        `workspace-${activeWorkspace.name.toLowerCase().replace(/\s+/g, '-')}.json`,
                        'application/json'
                      )
                    }
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 text-left transition-all flex items-center gap-2.5"
                  >
                    <Download className="w-5 h-5 text-indigo-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Backup Workspace JSON
                      </div>
                      <div className="text-[10px] text-slate-400">Formulas, notes & state</div>
                    </div>
                  </button>

                  <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 text-left transition-all flex items-center gap-2.5 cursor-pointer">
                    <Upload className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Import Workspace JSON
                      </div>
                      <div className="text-[10px] text-slate-400">Strict schema validated</div>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {importError && (
                  <div className="p-3 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                    {importError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
