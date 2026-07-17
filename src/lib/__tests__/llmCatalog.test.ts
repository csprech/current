import { describe, it, expect } from "vitest";
import {
  LLM_PROVIDERS,
  LLM_MODELS,
  DEFAULT_OLLAMA_MODEL,
  getDefaultModelForProvider,
} from "@/lib/llmCatalog";

describe("llmCatalog", () => {
  it("lists all four LLM providers, with Ollama last", () => {
    expect(LLM_PROVIDERS.map((p) => p.value)).toEqual(["google", "openai", "anthropic", "ollama"]);
  });

  it("labels Ollama as local so users know no key is needed", () => {
    const ollama = LLM_PROVIDERS.find((p) => p.value === "ollama");
    expect(ollama?.label).toMatch(/local/i);
  });

  it("has a static model list for every cloud provider", () => {
    expect(LLM_MODELS.google.length).toBeGreaterThan(0);
    expect(LLM_MODELS.openai.length).toBeGreaterThan(0);
    expect(LLM_MODELS.anthropic.length).toBeGreaterThan(0);
  });

  it("keeps Ollama's model list empty (models are discovered from the daemon)", () => {
    expect(LLM_MODELS.ollama).toEqual([]);
  });

  it("defaults each cloud provider to its first listed model", () => {
    expect(getDefaultModelForProvider("google")).toBe(LLM_MODELS.google[0].value);
    expect(getDefaultModelForProvider("openai")).toBe(LLM_MODELS.openai[0].value);
    expect(getDefaultModelForProvider("anthropic")).toBe(LLM_MODELS.anthropic[0].value);
  });

  it("defaults Ollama to the placeholder model despite the empty list", () => {
    expect(getDefaultModelForProvider("ollama")).toBe(DEFAULT_OLLAMA_MODEL);
    expect(DEFAULT_OLLAMA_MODEL).toBe("llama3.2");
  });
});
