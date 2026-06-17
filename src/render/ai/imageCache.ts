import { hashSeed } from '../seed';

/**
 * IndexedDB-backed cache for generated images. Keyed by a content hash of the
 * component identity, so the same name/description reloads instantly and works
 * offline. Falls back to an in-memory map when IndexedDB is unavailable
 * (e.g. during tests or SSR).
 */

const DB_NAME = 'octopus-art';
const STORE = 'images';

export function imageKey(kind: string, name: string, description = ''): string {
  return `${kind}:${hashSeed(`${kind}::${name}::${description}`).toString(36)}`;
}

const memory = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function getCachedImage(key: string): Promise<string | null> {
  if (memory.has(key)) return memory.get(key)!;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function putCachedImage(key: string, dataUrl: string): Promise<void> {
  memory.set(key, dataUrl);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
