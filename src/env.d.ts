import type { GeminiCredentialStatus } from '../electron/preload';

declare global {
  interface Window {
    calcoraDesktop?: {
      getGeminiCredentialStatus: () => Promise<GeminiCredentialStatus>;
      setGeminiApiKey: (key: string) => Promise<{ success: boolean; message: string }>;
      clearGeminiApiKey: () => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};
