"use client";

import { useEffect, useState } from "react";
import { getProviderSettings } from "@/store/utils/localStorage";

export interface ComfyUIControlNetInfo {
  controlnets: string[];
  /** Installed aux depth preprocessor class, or null when the pack is absent. */
  depthPreprocessor: string | null;
  error: string | null;
}

// Module-level cache: one discovery round per page load is plenty.
let cached: ComfyUIControlNetInfo | null = null;
let inflight: Promise<void> | null = null;

async function discover(): Promise<void> {
  try {
    const baseUrl = getProviderSettings().providers.comfyui?.baseUrl;
    const response = await fetch("/api/comfyui/controlnets", {
      headers: baseUrl ? { "X-ComfyUI-URL": baseUrl } : undefined,
    });
    const data = await response.json();
    cached = {
      controlnets: Array.isArray(data.controlnets) ? data.controlnets : [],
      depthPreprocessor: typeof data.depthPreprocessor === "string" ? data.depthPreprocessor : null,
      error: data.success ? null : (data.error ?? null),
    };
  } catch {
    cached = { controlnets: [], depthPreprocessor: null, error: "Could not reach the Current server." };
  }
}

/** For tests: reset the module cache between cases. */
export function resetComfyUIControlNetsCache(): void {
  cached = null;
  inflight = null;
}

/**
 * Discover ControlNet models (and depth-preprocessor availability) from the
 * local ComfyUI daemon. Cached for the page's lifetime.
 */
export function useComfyUIControlNets(enabled: boolean): ComfyUIControlNetInfo & { loading: boolean } {
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
    controlnets: cached?.controlnets ?? [],
    depthPreprocessor: cached?.depthPreprocessor ?? null,
    error: cached?.error ?? null,
    loading: enabled && cached === null,
  };
}
