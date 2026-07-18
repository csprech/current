"use client";

import { useEffect, useState } from "react";
import { getProviderSettings } from "@/store/utils/localStorage";

export interface ElevenLabsVoiceEntry {
  id: string;
  name: string;
  category: string | null;
}

// Module-level cache: one voice fetch per page load is plenty.
let cached: ElevenLabsVoiceEntry[] | null = null;
let cachedError: string | null = null;
let inflight: Promise<void> | null = null;

async function discover(): Promise<void> {
  try {
    const apiKey = getProviderSettings().providers.elevenlabs?.apiKey;
    const response = await fetch("/api/elevenlabs/voices", {
      headers: apiKey ? { "X-ElevenLabs-Key": apiKey } : undefined,
    });
    const data = await response.json();
    cached = Array.isArray(data.voices) ? data.voices : [];
    cachedError = data.success ? null : (data.error ?? null);
  } catch {
    cached = [];
    cachedError = "Could not reach the Current server.";
  }
}

/** For tests: reset the module cache between cases. */
export function resetElevenLabsVoicesCache(): void {
  cached = null;
  cachedError = null;
  inflight = null;
}

/** The account's ElevenLabs voices for the TTS voice picker. */
export function useElevenLabsVoices(enabled: boolean): {
  voices: ElevenLabsVoiceEntry[];
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
    voices: cached ?? [],
    error: cachedError,
    loading: enabled && cached === null,
  };
}
