/**
 * GET /api/ollama/models — the daemon-discovery proxy. The daemon's
 * /api/tags endpoint is mocked at the fetch layer; an absent daemon must
 * come back as success:false with a hint, never an error status.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "../route";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe("GET /api/ollama/models", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OLLAMA_URL", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps the daemon's tag list to id/name/parameterSize entries", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "llama3.2:latest", model: "llama3.2:latest", details: { parameter_size: "3.2B" } },
          { name: "qwen3:8b" },
        ],
      }),
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.models).toEqual([
      { id: "llama3.2:latest", name: "llama3.2:latest", parameterSize: "3.2B" },
      { id: "qwen3:8b", name: "qwen3:8b", parameterSize: null },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:11434/api/tags");
  });

  it("queries the daemon named by the X-Ollama-URL header", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ models: [] }) });

    await GET(makeRequest({ "X-Ollama-URL": "http://gpu-box:11434" }));

    expect(fetchMock.mock.calls[0][0]).toBe("http://gpu-box:11434/api/tags");
  });

  it("reports an unreachable daemon as success:false with a hint, not an error status", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.models).toEqual([]);
    expect(data.error).toContain("Could not reach Ollama at http://localhost:11434");
  });

  it("reports a non-OK daemon response with its status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toContain("responded with 500");
  });

  it("tolerates a tags payload without a models array", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.models).toEqual([]);
  });
});
