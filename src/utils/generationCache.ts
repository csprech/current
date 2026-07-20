/**
 * Session cache of generated media, keyed by `${nodeId}:${itemId}`.
 *
 * Carousel history entries store ids only — the bytes live on disk when a
 * generations folder is configured, and nowhere at all when it isn't.
 * Executors drop each finished generation in here so the carousel and the
 * media viewer can navigate this session's history without a project folder
 * (and without a disk round-trip when one exists). LRU-capped so long
 * sessions don't hoard base64 payloads indefinitely.
 */

const MAX_ENTRIES = 64;

const cache = new Map<string, string>();

export function generationCacheKey(nodeId: string, itemId: string): string {
  return `${nodeId}:${itemId}`;
}

/** Store media for a history item, evicting the least-recently-used overflow. */
export function rememberGeneration(key: string, media: string): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, media);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Media for a history item, or null when this session never produced it. */
export function recallGeneration(key: string): string | null {
  const media = cache.get(key);
  if (media === undefined) return null;
  // Refresh recency so navigated-to items outlive untouched ones
  cache.delete(key);
  cache.set(key, media);
  return media;
}

/** Follow a history item whose id was renamed by the save-generation API. */
export function rekeyGeneration(oldKey: string, newKey: string): void {
  const media = cache.get(oldKey);
  if (media === undefined) return;
  cache.delete(oldKey);
  rememberGeneration(newKey, media);
}

/** Test hook: reset the cache between cases. */
export function clearGenerationCache(): void {
  cache.clear();
}
