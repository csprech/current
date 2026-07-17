"use client";

import { useEffect, useState } from "react";
import { getProviderSettings } from "@/store/utils/localStorage";

export interface OllamaModelEntry {
  id: string;
  name: string;
  parameterSize: string | null;
}

// Module-level cache: one discovery round per page load is plenty.
let cached: OllamaModelEntry[] | null = null;
let cachedError: string | null = null;
let inflight: Promise<void> | null = null;

async function discover(): Promise<void> {
  try {
    const baseUrl = getProviderSettings().providers.ollama?.baseUrl;
    const response = await fetch("/api/ollama/models", {
      headers: baseUrl ? { "X-Ollama-URL": baseUrl } : undefined,
    });
    const data = await response.json();
    cached = Array.isArray(data.models) ? data.models : [];
    cachedError = data.success ? null : (data.error ?? null);
  } catch {
    cached = [];
    cachedError = "Could not reach the Current server.";
  }
}

/** For tests: reset the module cache between cases. */
export function resetOllamaModelsCache(): void {
  cached = null;
  cachedError = null;
  inflight = null;
}

/**
 * Discover models pulled into the local Ollama daemon. Returns an empty list
 * (with an error hint) when the daemon is not running — the model field stays
 * a free-text input either way, so users can always type a model name.
 */
export function useOllamaModels(enabled: boolean): {
  models: OllamaModelEntry[];
  error: string | null;
  loading: boolean;
} {
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled || cached !== null) return;
    if (!inflight) inflight = discover();
    let mounted = true;
    inflight.then(() => {
      if (mounted) force((n) => n + 1);
    });
    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    models: cached ?? [],
    error: cachedError,
    loading: enabled && cached === null,
  };
}
