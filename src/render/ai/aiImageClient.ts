import type { ComponentKind } from '../../model/types';
import { getCachedImage, putCachedImage, imageKey } from './imageCache';

/**
 * Optional AI art client. Only active when VITE_AI_IMAGE_URL points at a backend
 * proxy that holds the provider key (the key is never exposed to the browser).
 * When unset, AI is disabled and callers fall back to procedural art.
 */

const ENDPOINT = import.meta.env.VITE_AI_IMAGE_URL as string | undefined;

export function isAiEnabled(): boolean {
  return typeof ENDPOINT === 'string' && ENDPOINT.length > 0;
}

export interface GenerateParams {
  kind: ComponentKind;
  name: string;
  description?: string;
}

/**
 * Returns a data URL / image URL for the component, using the cache first.
 * Resolves to null when AI is disabled or the request fails — never throws,
 * so the procedural placeholder simply stays.
 */
export async function generateImage(params: GenerateParams): Promise<string | null> {
  if (!isAiEnabled()) return null;
  const key = imageKey(params.kind, params.name, params.description);
  const cached = await getCachedImage(key);
  if (cached) return cached;

  try {
    const res = await fetch(ENDPOINT!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { image?: string };
    if (!data.image) return null;
    await putCachedImage(key, data.image);
    return data.image;
  } catch {
    return null;
  }
}
