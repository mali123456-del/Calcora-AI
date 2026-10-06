import { contextBridge, ipcRenderer } from 'electron';

export interface GeminiCredentialStatus {
  configured: boolean;
  managedByDesktop: boolean;
  secureStorageAvailable: boolean;
  message: string;
}

const calcoraDesktop = {
  getGeminiCredentialStatus: (): Promise<GeminiCredentialStatus> =>
    ipcRenderer.invoke('calcora:gemini-status'),
  setGeminiApiKey: (key: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('calcora:gemini-set-key', key),
  clearGeminiApiKey: (): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('calcora:gemini-clear-key'),
};

contextBridge.exposeInMainWorld('calcoraDesktop', calcoraDesktop);
