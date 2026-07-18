/**
 * API Header Builder Utilities
 *
 * Centralizes the duplicated header-building logic for API calls
 * across executeWorkflow and regenerateNode.
 */

import { ProviderType, ProviderSettings, LLMProvider } from "@/types";

/**
 * Header name mapping for each provider
 */
const PROVIDER_HEADER_MAP: Record<ProviderType, string> = {
  gemini: "X-Gemini-API-Key",
  replicate: "X-Replicate-API-Key",
  fal: "X-Fal-API-Key",
  kie: "X-Kie-Key",
  wavespeed: "X-WaveSpeed-Key",
  openai: "X-OpenAI-API-Key",
  anthropic: "X-Anthropic-API-Key",
  elevenlabs: "X-ElevenLabs-Key",
  ollama: "", // local daemon — configured by URL (X-Ollama-URL), not a key
  comfyui: "", // local daemon — configured by URL (X-ComfyUI-URL), not a key
};

/**
 * Build headers for image/video generation API calls.
 * Adds the appropriate API key header based on the provider.
 */
export function buildGenerateHeaders(
  provider: ProviderType | string,
  providerSettings: ProviderSettings
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const providerKey = provider as ProviderType;
  const headerName = PROVIDER_HEADER_MAP[providerKey];
  if (headerName) {
    const config = providerSettings.providers[providerKey];
    if (config?.apiKey) {
      headers[headerName] = config.apiKey;
    }
  }

  // ComfyUI is addressed by daemon URL rather than an API key
  if (providerKey === "comfyui") {
    const config = providerSettings.providers.comfyui;
    if (config?.baseUrl) {
      headers["X-ComfyUI-URL"] = config.baseUrl;
    }
  }

  return headers;
}

/**
 * Build headers for LLM API calls.
 * Maps LLM provider names ("google", "openai") to their API key headers.
 */
export function buildLlmHeaders(
  llmProvider: LLMProvider | string,
  providerSettings: ProviderSettings
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (llmProvider === "google") {
    const geminiConfig = providerSettings.providers.gemini;
    if (geminiConfig?.apiKey) {
      headers["X-Gemini-API-Key"] = geminiConfig.apiKey;
    }
  } else if (llmProvider === "openai") {
    const openaiConfig = providerSettings.providers.openai;
    if (openaiConfig?.apiKey) {
      headers["X-OpenAI-API-Key"] = openaiConfig.apiKey;
    }
  } else if (llmProvider === "anthropic") {
    const anthropicConfig = providerSettings.providers.anthropic;
    if (anthropicConfig?.apiKey) {
      headers["X-Anthropic-API-Key"] = anthropicConfig.apiKey;
    }
  } else if (llmProvider === "ollama") {
    const ollamaConfig = providerSettings.providers.ollama;
    if (ollamaConfig?.baseUrl) {
      headers["X-Ollama-URL"] = ollamaConfig.baseUrl;
    }
  }

  return headers;
}
