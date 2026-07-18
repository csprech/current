import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOllamaModels, resetOllamaModelsCache } from "@/hooks/useOllamaModels";

describe("useOllamaModels", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    resetOllamaModelsCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays idle when not enabled", () => {
    const { result } = renderHook(() => useOllamaModels(false));
    expect(result.current.loading).toBe(false);
    expect(result.current.models).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("discovers models once enabled", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: true,
        models: [{ id: "llama3.2:latest", name: "llama3.2:latest", parameterSize: "3.2B" }],
      }),
    });

    const { result } = renderHook(() => useOllamaModels(true));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.models).toEqual([
      { id: "llama3.2:latest", name: "llama3.2:latest", parameterSize: "3.2B" },
    ]);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/ollama/models");
  });

  it("shares one discovery round across hook instances (module cache)", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ success: true, models: [] }),
    });

    const first = renderHook(() => useOllamaModels(true));
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    const second = renderHook(() => useOllamaModels(true));
    expect(second.result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the daemon-down hint while keeping the field usable", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: false,
        models: [],
        error: "Could not reach Ollama at http://localhost:11434. Start it with `ollama serve`.",
      }),
    });

    const { result } = renderHook(() => useOllamaModels(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.models).toEqual([]);
    expect(result.current.error).toContain("Could not reach Ollama");
  });

  it("sends the configured base URL as X-Ollama-URL", async () => {
    localStorage.setItem(
      "current-provider-settings",
      JSON.stringify({
        providers: {
          ollama: { id: "ollama", name: "Ollama (local)", enabled: true, apiKey: null, baseUrl: "http://gpu-box:11434" },
        },
      })
    );
    fetchMock.mockResolvedValue({ json: async () => ({ success: true, models: [] }) });

    const { result } = renderHook(() => useOllamaModels(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { "X-Ollama-URL": "http://gpu-box:11434" } });
  });
});
