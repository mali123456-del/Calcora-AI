import React, { useEffect, useState } from 'react';
import type { GeminiCredentialStatus } from '../../electron/preload';

export const DesktopGeminiSettings: React.FC = () => {
  const [status, setStatus] = useState<GeminiCredentialStatus | null>(null);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const desktop = typeof window !== 'undefined' ? window.calcoraDesktop : undefined;

  useEffect(() => {
    if (!desktop) return;
    void desktop.getGeminiCredentialStatus().then(setStatus).catch(() => {
      setStatus({ configured: false, managedByDesktop: false, secureStorageAvailable: false, message: 'Secure desktop settings are unavailable.' });
    });
  }, [desktop]);

  if (!desktop) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !key.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await desktop.setGeminiApiKey(key);
      setMessage(result.message);
      if (result.success) {
        setKey('');
        setStatus(await desktop.getGeminiCredentialStatus());
      }
    } catch {
      setMessage('The key could not be stored securely.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await desktop.clearGeminiApiKey();
      setMessage(result.message);
      if (result.success) setStatus(await desktop.getGeminiCredentialStatus());
    } catch {
      setMessage('The stored key could not be removed.');
    } finally {
      setBusy(false);
    }
  };

  return <details className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
    <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">Desktop Gemini settings</summary>
    <div className="mt-3 space-y-3">
      <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        Gemini is optional. Local-only mode never sends Tutor requests to Gemini. The desktop app saves the key encrypted by the operating-system credential store; it is not bundled with the installer.
      </p>
      <p className="text-[11px]" role="status">{status?.message ?? 'Checking secure storage…'}</p>
      {status?.secureStorageAvailable ? <form onSubmit={save} className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="desktop-gemini-key">Gemini API key</label>
        <input id="desktop-gemini-key" type="password" autoComplete="new-password" value={key} onChange={(event) => setKey(event.target.value)} maxLength={256} placeholder="Paste Gemini API key" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <button type="submit" disabled={busy || !key.trim()} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save encrypted key'}</button>
        {status?.managedByDesktop && <button type="button" onClick={() => void clear()} disabled={busy} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Remove key</button>}
      </form> : <p className="text-[11px] text-amber-700 dark:text-amber-300">No key was stored. Configure Gemini through a secure OS credential backend or server environment instead.</p>}
      {message && <p role="status" aria-live="polite" className="text-[11px] text-cyan-700 dark:text-cyan-300">{message}</p>}
    </div>
  </details>;
};
