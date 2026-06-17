import type { ArchDocument } from '../model/types';
import { createEmptyDocument } from '../model/types';

const STORAGE_KEY = 'octopus.document.v1';

export function loadDocument(): ArchDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDocument();
    const parsed = JSON.parse(raw) as ArchDocument;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.nodes)) return parsed;
  } catch {
    // fall through to a fresh document
  }
  return createEmptyDocument();
}

export function saveDocument(doc: ArchDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

/** Debounce helper so autosave doesn't run on every drag tick. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function exportToFile(doc: ArchDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.name.replace(/\s+/g, '-').toLowerCase() || 'architecture'}.octopus.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedDocument(text: string): ArchDocument {
  const parsed = JSON.parse(text) as ArchDocument;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Not a valid Octopus document');
  }
  return parsed;
}
