/**
 * Provider Types
 *
 * Types for multi-provider support including image generation
 * providers and LLM providers.
 */

// Provider Types for multi-provider support (image/video generation + local LLMs)
export type ProviderType = "gemini" | "openai" | "anthropic" | "replicate" | "fal" | "kie" | "wavespeed" | "ollama" | "comfyui";

// Model pricing info (stored when model is selected)
export interface SelectedModelPricing {
  type: 'per-run' | 'per-second';
  amount: number;
}

// Selected model for image/video generation nodes
export interface SelectedModel {
  provider: ProviderType;
  modelId: string;
  displayName: string;
  pricing?: SelectedModelPricing;  // Optional pricing info from provider API
  capabilities?: string[];  // Model capabilities (e.g., "text-to-image", "image-to-3d")
}

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  enabled: boolean;
  apiKey: string | null;
  apiKeyEnvVar?: string; // For providers using environment variables (e.g., Gemini)
  /** For local providers (Ollama, ComfyUI): daemon base URL instead of an API key. */
  baseUrl?: string | null;
}

export interface ProviderSettings {
  providers: Record<ProviderType, ProviderConfig>;
}

// LLM Provider Options ("ollama" runs against a local daemon — no key, no cloud)
export type LLMProvider = "google" | "openai" | "anthropic" | "ollama";

// LLM Model Options. Cloud models are a closed set; Ollama model names are
// whatever the user has pulled locally, hence the open string escape hatch
// ((string & {}) keeps literal autocompletion working).
export type LLMModelType =
  | "gemini-2.5-flash"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-preview"
  | "gemini-3.1-pro-preview"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "claude-opus-4.6"
  | "claude-sonnet-4.5"
  | "claude-haiku-4.5"
  | (string & {});

// Recently used models tracking
export interface RecentModel {
  provider: ProviderType;
  modelId: string;
  displayName: string;
  timestamp: number;
}
