/**
 * The single active document available to the Tutor.
 *
 * Deliberately holds ONE document: selecting a new file replaces the previous
 * context entirely, which is what prevents cross-document leakage.
 *
 * Only the fields the Tutor needs travel to the server. The extracted text stays
 * in memory on the user's machine; nothing is persisted to storage and nothing is
 * uploaded to a third party.
 */
import { createDocumentContext, type DocumentContext } from './documentContext';

export interface ActiveDocument {
  fileName: string;
  /** Page numbers actually selected by the learner. */
  selectedPages: number[];
  totalPages: number;
  totalChars: number;
  needsOcr: boolean;
  /** Page-aware text for the selected pages only. */
  pages: Array<{ pageNumber: number; text: string; charCount: number }>;
}

type Listener = (document: ActiveDocument | null) => void;

let active: ActiveDocument | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(active);
    } catch {
      // A failing subscriber must not break the others.
    }
  }
}

export function setActiveDocument(value: ActiveDocument | null): void {
  active = value;
  emit();
}

export function getActiveDocument(): ActiveDocument | null {
  return active;
}

export function clearActiveDocument(): void {
  active = null;
  emit();
}

export function subscribeActiveDocument(listener: Listener): () => void {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Converts the active document into the page-aware context the Tutor consumes.
 * Returns null when no document is attached or the selection has no readable text.
 */
export function activeDocumentToContext(): DocumentContext | null {
  if (!active) return null;
  const pages = active.selectedPages.length
    ? active.pages.filter((page) => active!.selectedPages.includes(page.pageNumber))
    : active.pages;
  const context = createDocumentContext({
    fileName: active.fileName,
    pages,
    totalPageCount: active.totalPages,
    needsOcr: active.needsOcr,
  });
  return context.hasText ? context : null;
}
