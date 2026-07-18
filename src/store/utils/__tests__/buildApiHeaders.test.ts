import { describe, it, expect } from "vitest";
import { buildGenerateHeaders, buildLlmHeaders } from "../buildApiHeaders";
import type { ProviderSettings } from "@/types";

function makeSettings(
  overrides: Partial<Record<string, { apiKey?: string | null; baseUrl?: string | null }>> = {}
): ProviderSettings {
  const defaults: Record<string, { id: string; name: string; enabled: boolean; apiKey: string | null; baseUrl?: string | null }> = {
    gemini: { id: "gemini", name: "Gemini", enabled: true, apiKey: null },
    replicate: { id: "replicate", name: "Replicate", enabled: true, apiKey: null },
    fal: { id: "fal", name: "fal.ai", enabled: true, apiKey: null },
    kie: { id: "kie", name: "Kie.ai", enabled: true, apiKey: null },
    wavespeed: { id: "wavespeed", name: "WaveSpeed", enabled: true, apiKey: null },
    openai: { id: "openai", name: "OpenAI", enabled: true, apiKey: null },
    ollama: { id: "ollama", name: "Ollama (local)", enabled: true, apiKey: null, baseUrl: null },
    comfyui: { id: "comfyui", name: "ComfyUI (local)", enabled: true, apiKey: null, baseUrl: null },
  };
  for (const [key, val] of Object.entries(overrides)) {
    if (defaults[key]) {
      if (val.apiKey !== undefined) defaults[key].apiKey = val.apiKey;
      if (val.baseUrl !== undefined) defaults[key].baseUrl = val.baseUrl;
    }
  }
  return { providers: defaults } as unknown as ProviderSettings;
}

describe("buildGenerateHeaders", () => {
  it("should always include Content-Type", () => {
    const headers = buildGenerateHeaders("gemini", makeSettings());
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should add Gemini API key header", () => {
    const settings = makeSettings({ gemini: { apiKey: "gem-key-123" } });
    const headers = buildGenerateHeaders("gemini", settings);
    expect(headers["X-Gemini-API-Key"]).toBe("gem-key-123");
  });

  it("should add Replicate API key header", () => {
    const settings = makeSettings({ replicate: { apiKey: "rep-key" } });
    const headers = buildGenerateHeaders("replicate", settings);
    expect(headers["X-Replicate-API-Key"]).toBe("rep-key");
  });

  it("should add fal.ai API key header", () => {
    const settings = makeSettings({ fal: { apiKey: "fal-key" } });
    const headers = buildGenerateHeaders("fal", settings);
    expect(headers["X-Fal-API-Key"]).toBe("fal-key");
  });

  it("should add Kie API key header", () => {
    const settings = makeSettings({ kie: { apiKey: "kie-key" } });
    const headers = buildGenerateHeaders("kie", settings);
    expect(headers["X-Kie-Key"]).toBe("kie-key");
  });

  it("should add WaveSpeed API key header", () => {
    const settings = makeSettings({ wavespeed: { apiKey: "ws-key" } });
    const headers = buildGenerateHeaders("wavespeed", settings);
    expect(headers["X-WaveSpeed-Key"]).toBe("ws-key");
  });

  it("should not add header when API key is null", () => {
    const headers = buildGenerateHeaders("gemini", makeSettings());
    expect(headers["X-Gemini-API-Key"]).toBeUndefined();
  });

  it("should handle unknown provider gracefully", () => {
    const headers = buildGenerateHeaders("unknown", makeSettings());
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("should send the daemon URL, not a key, for comfyui", () => {
    const settings = makeSettings({ comfyui: { baseUrl: "http://gpu-box:8188" } });
    const headers = buildGenerateHeaders("comfyui", settings);
    expect(headers["X-ComfyUI-URL"]).toBe("http://gpu-box:8188");
    expect(Object.keys(headers).filter((h) => h.toLowerCase().includes("key"))).toEqual([]);
  });

  it("should omit X-ComfyUI-URL when no base URL is configured", () => {
    const headers = buildGenerateHeaders("comfyui", makeSettings());
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });
});

describe("buildLlmHeaders", () => {
  it("should always include Content-Type", () => {
    const headers = buildLlmHeaders("google", makeSettings());
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("should add Gemini API key for google provider", () => {
    const settings = makeSettings({ gemini: { apiKey: "gem-key" } });
    const headers = buildLlmHeaders("google", settings);
    expect(headers["X-Gemini-API-Key"]).toBe("gem-key");
  });

  it("should add OpenAI API key for openai provider", () => {
    const settings = makeSettings({ openai: { apiKey: "oai-key" } });
    const headers = buildLlmHeaders("openai", settings);
    expect(headers["X-OpenAI-API-Key"]).toBe("oai-key");
  });

  it("should not add header when API key is null", () => {
    const headers = buildLlmHeaders("google", makeSettings());
    expect(headers["X-Gemini-API-Key"]).toBeUndefined();
  });

  it("should handle unknown LLM provider gracefully", () => {
    const headers = buildLlmHeaders("unknown", makeSettings());
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("should add X-Ollama-URL for ollama provider when a base URL is set", () => {
    const settings = makeSettings({ ollama: { baseUrl: "http://192.168.1.20:11434" } });
    const headers = buildLlmHeaders("ollama", settings);
    expect(headers["X-Ollama-URL"]).toBe("http://192.168.1.20:11434");
  });

  it("should not add X-Ollama-URL when no base URL is configured", () => {
    const headers = buildLlmHeaders("ollama", makeSettings());
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("should never send an API key header for ollama", () => {
    const settings = makeSettings({ ollama: { baseUrl: "http://localhost:11434" } });
    const headers = buildLlmHeaders("ollama", settings);
    const keyHeaders = Object.keys(headers).filter((h) => h.toLowerCase().includes("key"));
    expect(keyHeaders).toEqual([]);
  });
});
