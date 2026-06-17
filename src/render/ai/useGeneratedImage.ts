import { useEffect, useState } from 'react';
import type { ComponentKind } from '../../model/types';
import { generateImage, isAiEnabled } from './aiImageClient';

/**
 * Returns an AI-generated image URL for a component, or null while it loads /
 * when AI is disabled. Callers render procedural art until this resolves, so
 * the procedural image is always the immediate placeholder.
 *
 * Currently scoped to microservices, whose art is driven by name/description.
 */
export function useGeneratedImage(kind: ComponentKind, name: string, description?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== 'microservice' || !isAiEnabled()) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    generateImage({ kind, name, description }).then((result) => {
      if (!cancelled) setUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, name, description]);

  return url;
}
