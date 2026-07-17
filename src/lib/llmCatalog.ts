/**
 * Shared LLM provider/model catalog.
 *
 * Single source of truth for the provider dropdowns and per-provider model
 * lists rendered on the LLM node, the inspector, the bulk panel, and the
 * fallback popover. Ollama's list is empty here by design: its models are
 * whatever the local daemon has pulled, discovered at runtime via
 * /api/ollama/models.
 */

import type { LLMProvider, LLMModelType } from "@/types";

export const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "ollama", label: "Ollama (local)" },
];

export const LLM_MODELS: Record<LLMProvider, { value: LLMModelType; label: string }[]> = {
  google: [
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-3-pro-preview", label: "Gemini 3.0 Pro" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  ],
  openai: [
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
  ],
  anthropic: [
    { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
    { value: "claude-opus-4.6", label: "Claude Opus 4.6" },
  ],
  ollama: [], // dynamic — discovered from the local daemon
};

export const DEFAULT_OLLAMA_MODEL: LLMModelType = "llama3.2";

/** First model to select when switching an LLM node to a provider. */
export function getDefaultModelForProvider(provider: LLMProvider): LLMModelType {
  if (provider === "ollama") return DEFAULT_OLLAMA_MODEL;
  return LLM_MODELS[provider][0].value;
}
